import UIKit

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: windowScene)
        window.backgroundColor = .gameBackground
        window.rootViewController = GameViewController()
        window.makeKeyAndVisible()
        self.window = window
    }

    // The game saves when the page is hidden. Ask iOS for a few seconds so the save and the
    // save safety copy can finish before the app is suspended.
    func sceneDidEnterBackground(_ scene: UIScene) {
        let app = UIApplication.shared
        let task = BackgroundTask()
        task.id = app.beginBackgroundTask(withName: "Save game") { task.end() }
        DispatchQueue.main.asyncAfter(deadline: .now() + 8) { task.end() }
    }
}

private final class BackgroundTask {
    var id: UIBackgroundTaskIdentifier = .invalid
    func end() {
        guard id != .invalid else { return }
        UIApplication.shared.endBackgroundTask(id)
        id = .invalid
    }
}

extension UIColor {
    /// The game's background (#05060F), also used for the launch screen.
    static let gameBackground = UIColor(red: 5 / 255, green: 6 / 255, blue: 15 / 255, alpha: 1)
}
