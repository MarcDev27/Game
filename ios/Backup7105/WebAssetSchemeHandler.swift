import Foundation
import WebKit

/// Serves the game's files from the app bundle at backup7105://game/…
///
/// The game is bundled inside the app (copied by the "Bundle web game" build phase), so it
/// works offline and never loads code from the internet. A custom scheme instead of file://
/// gives the page a stable origin, which ES modules, fetch() and IndexedDB need.
final class WebAssetSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "backup7105"
    static let startURL = URL(string: "\(scheme)://game/index.html")!

    static var webRoot: URL {
        Bundle.main.bundleURL.appendingPathComponent("web", isDirectory: true)
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(URLError(.badURL))
            return
        }
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let root = Self.webRoot.standardizedFileURL
        let file = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
        guard file.path.hasPrefix(root.path + "/"), let data = try? Data(contentsOf: file) else {
            respond(urlSchemeTask, url: url, status: 404, type: "text/plain", data: Data("Not found".utf8))
            return
        }
        respond(urlSchemeTask, url: url, status: 200, type: Self.mimeType(for: file.pathExtension), data: data)
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    private func respond(_ task: WKURLSchemeTask, url: URL, status: Int, type: String, data: Data) {
        let headers = [
            "Content-Type": type,
            "Content-Length": String(data.count),
            "Cache-Control": "no-cache",
        ]
        guard let response = HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1", headerFields: headers) else {
            task.didFailWithError(URLError(.cannotParseResponse))
            return
        }
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    static func mimeType(for ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json", "webmanifest": return "application/json"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "svg": return "image/svg+xml"
        case "wav": return "audio/wav"
        case "mp3": return "audio/mpeg"
        case "txt": return "text/plain; charset=utf-8"
        default: return "application/octet-stream"
        }
    }
}
