import Foundation

/// The save safety copy: the game sends its whole save set (the same format as a backup file)
/// whenever the saves change, and it is kept in Application Support, which iOS includes in
/// iCloud and computer backups of the device. If the web view's storage is ever wiped, the
/// game restores its saves from here. The copy before the latest is kept as well.
struct SaveMirror {
    private let fm = FileManager.default

    private var directory: URL {
        fm.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("SaveSafetyCopy", isDirectory: true)
    }
    private var latest: URL { directory.appendingPathComponent("latest.b7105") }
    private var previous: URL { directory.appendingPathComponent("previous.b7105") }

    var exists: Bool { fm.fileExists(atPath: latest.path) || fm.fileExists(atPath: previous.path) }

    func write(base64: String) throws {
        guard let data = Data(base64Encoded: base64), !data.isEmpty else {
            throw CocoaError(.fileWriteInapplicableStringEncoding)
        }
        try fm.createDirectory(at: directory, withIntermediateDirectories: true)
        if fm.fileExists(atPath: latest.path) {
            try? fm.removeItem(at: previous)
            try? fm.moveItem(at: latest, to: previous)
        }
        try data.write(to: latest, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }

    /// The latest copy as base64, or the one before it if the latest can't be read.
    func read() -> String? {
        for url in [latest, previous] {
            if let data = try? Data(contentsOf: url), !data.isEmpty { return data.base64EncodedString() }
        }
        return nil
    }
}
