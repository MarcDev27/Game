import UIKit
import WebKit

/// Full-screen web view running the bundled game.
///
/// iPhone Duo: built with the iOS 27.1 SDK, the app fills both displays in every pose. While the
/// phone is partly folded, UIKit reports the hinge as a `.division` reserved region; its frame is
/// passed to the game, which then keeps the game view and the controls on either side of it
/// (book pose: vertical hinge; laptop pose: game on top, controls below).
final class GameViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    private var webView: WKWebView!
    private let bridge = NativeBridge()
    private var lastFold = ""
    private var foldTimer: Timer?

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    // Swipes from the screen edges go to the game first; a second swipe opens the system UI.
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .allButUpsideDown }

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(WebAssetSchemeHandler(), forURLScheme: WebAssetSchemeHandler.scheme)
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.addUserScript(WKUserScript(source: bridge.bootstrapScript(), injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController.addScriptMessageHandler(bridge, contentWorld: .page, name: NativeBridge.handlerName)

        let web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = true
        web.backgroundColor = .gameBackground
        web.scrollView.backgroundColor = .gameBackground
        web.scrollView.isScrollEnabled = false
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.pinchGestureRecognizer?.isEnabled = false
        web.allowsLinkPreview = false
        web.allowsBackForwardNavigationGestures = false
        web.navigationDelegate = self
        web.uiDelegate = self
        #if DEBUG
        if #available(iOS 16.4, *) { web.isInspectable = true } // Safari → Develop menu
        #endif
        bridge.presenter = self
        webView = web
        view = web
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        webView.load(URLRequest(url: WebAssetSchemeHandler.startURL))
        // Folding without resizing the window doesn't always trigger a layout pass, so also check
        // the hinge a few times a second (cheap: it only reads a few rectangles).
        foldTimer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.updateFold() }
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        updateFold()
    }

    // MARK: - iPhone Duo hinge

    private func currentFold() -> [String: Any] {
        #if !NO_DUO_SDK
        if #available(iOS 27.1, *) {
            // Only active while the phone is partly folded; when it is flat there is no division.
            if let division = view.reservedRegions(kind: .division).first(where: { $0.isActive }) {
                let f = division.frame
                if f.height > f.width {
                    return ["mode": "book", "x": f.minX, "w": f.width]
                }
                return ["mode": "laptop", "y": f.minY, "h": f.height]
            }
        }
        #endif
        return ["mode": "none"]
    }

    private func updateFold() {
        guard let json = NativeBridge.json(currentFold()), json != lastFold else { return }
        lastFold = json
        webView.evaluateJavaScript("window.__b7105Native && window.__b7105Native.setFold(\(json))", completionHandler: nil)
    }

    // MARK: - Navigation

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        lastFold = ""
        updateFold()
    }

    // If iOS ends the game's web process (for example under memory pressure), start it again
    // instead of leaving a blank screen. The game autosaves, so little progress is lost.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.load(URLRequest(url: WebAssetSchemeHandler.startURL))
    }

    // Links to websites open in Safari; the game itself stays on its own pages.
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
        guard let url = navigationAction.request.url else { return .cancel }
        if url.scheme == WebAssetSchemeHandler.scheme || url.scheme == "about" || url.scheme == "blob" || url.scheme == "data" {
            return .allow
        }
        if url.scheme == "https" || url.scheme == "http" || url.scheme == "mailto" {
            _ = await UIApplication.shared.open(url)
        }
        return .cancel
    }

    // MARK: - JavaScript dialogs (the game asks before deleting or restoring saves)

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo) async {
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in continuation.resume() })
            present(alert, animated: true)
        }
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo) async -> Bool {
        await withCheckedContinuation { continuation in
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in continuation.resume(returning: false) })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in continuation.resume(returning: true) })
            present(alert, animated: true)
        }
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo) async -> String? {
        await withCheckedContinuation { continuation in
            let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
            alert.addTextField { $0.text = defaultText }
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in continuation.resume(returning: nil) })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak alert] _ in continuation.resume(returning: alert?.textFields?.first?.text) })
            present(alert, animated: true)
        }
    }
}
