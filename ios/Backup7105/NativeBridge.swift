import UIKit
import WebKit

/// Messages from the game (src/core/native.js) to the app. The page calls
/// `window.webkit.messageHandlers.b7105.postMessage({ type, ... })` and awaits the reply.
final class NativeBridge: NSObject, WKScriptMessageHandlerWithReply {
    static let handlerName = "b7105"

    weak var presenter: UIViewController?
    private let mirror = SaveMirror()

    /// Runs before the game's own scripts: tells the game it is inside the app.
    func bootstrapScript() -> String {
        let info = Bundle.main.infoDictionary ?? [:]
        let version = "\(info["CFBundleShortVersionString"] as? String ?? "?") (\(info["CFBundleVersion"] as? String ?? "?"))"
        let buildURL = WebAssetSchemeHandler.webRoot.appendingPathComponent("build.txt")
        let webBuild = (try? String(contentsOf: buildURL, encoding: .utf8))?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let config: [String: Any] = [
            "platform": "ios",
            "version": version,
            "build": webBuild,
            "hasMirror": mirror.exists,
            "fold": ["mode": "none"],
        ]
        let json = Self.json(config) ?? "{}"
        return """
        (function () {
          var n = window.__b7105Native = \(json);
          n.setFold = function (f) { n.fold = f; window.dispatchEvent(new Event('nativefold')); };
          // Script errors go to the device log (Xcode console / Console.app), prefixed "B7105".
          function log(text) { try { window.webkit.messageHandlers.b7105.postMessage({ type: 'log', text: String(text) }); } catch (e) {} }
          window.addEventListener('error', function (e) { log('JS error: ' + e.message + ' at ' + e.filename + ':' + e.lineno); });
          window.addEventListener('unhandledrejection', function (e) { log('JS unhandled rejection: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)); });
        })();
        """
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) async -> (Any?, String?) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else {
            return (nil, "Malformed message")
        }
        switch type {
        case "ready":
            NSLog("B7105 game ready: window %@, fold %@", "\(body["size"] ?? "?")", "\(body["fold"] ?? "?")")
            return (true, nil)
        case "log":
            NSLog("B7105 %@", "\(body["text"] ?? "")")
            return (true, nil)
        case "haptic":
            Self.haptic(body["kind"] as? String ?? "")
            return (true, nil)
        case "mirrorSave":
            guard let data = body["data"] as? String else { return (nil, "Missing data") }
            do {
                try mirror.write(base64: data)
                return (true, nil)
            } catch {
                return (nil, error.localizedDescription)
            }
        case "mirrorLoad":
            return (mirror.read(), nil)
        case "share":
            guard let name = body["name"] as? String, let data = body["data"] as? String else { return (nil, "Missing file") }
            return await share(name: name, base64: data)
        default:
            return (nil, "Unknown message: \(type)")
        }
    }

    // MARK: - Share sheet (backups: Save to Files → iCloud Drive, AirDrop, …)

    @MainActor
    private func share(name: String, base64: String) async -> (Any?, String?) {
        guard let presenter, let data = Data(base64Encoded: base64) else { return (nil, "Nothing to share") }
        let safeName = name.replacingOccurrences(of: "/", with: "-")
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(safeName)
        do {
            try data.write(to: url, options: .atomic)
        } catch {
            return (nil, error.localizedDescription)
        }
        return await withCheckedContinuation { continuation in
            let sheet = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            sheet.popoverPresentationController?.sourceView = presenter.view
            sheet.popoverPresentationController?.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 1, height: 1)
            var finished = false
            sheet.completionWithItemsHandler = { _, completed, _, _ in
                guard !finished else { return }
                finished = true
                try? FileManager.default.removeItem(at: url)
                continuation.resume(returning: (completed ? "shared" : "cancelled", nil))
            }
            presenter.present(sheet, animated: true)
        }
    }

    // MARK: - Haptics

    @MainActor
    private static func haptic(_ kind: String) {
        switch kind {
        case "light": UIImpactFeedbackGenerator(style: .light).impactOccurred()
        case "medium": UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        case "heavy": UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        case "success": UINotificationFeedbackGenerator().notificationOccurred(.success)
        case "error": UINotificationFeedbackGenerator().notificationOccurred(.error)
        default: break
        }
    }

    static func json(_ object: Any) -> String? {
        guard let data = try? JSONSerialization.data(withJSONObject: object) else { return nil }
        return String(data: data, encoding: .utf8)
    }
}
