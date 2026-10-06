import SwiftUI
import WidgetKit

@MainActor
final class StudyStore: ObservableObject {
    @Published var assignments: [WatchAssignment] = []
    @Published var tasks: [WatchStudyTask] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var connected = false

    private let baseURL = "https://cfiwsgqcoeddqqukgxho.supabase.co/rest/v1/rpc/"
    private let apiKey = "sb_publishable_xExXRjTfzng1z4sa_bsGFg_EQ-ai6RO"
    private let appGroup = "group.com.jkstudymanagement.shared"

    private var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: appGroup)
    }

    var savedInviteCode: String {
        if let shared = sharedDefaults?.string(forKey: "jk.watch.invite"), !shared.isEmpty {
            return shared
        }
        return UserDefaults.standard.string(forKey: "jk.watch.invite") ?? ""
    }

    func connect(code: String) async -> Bool {
        let clean = code.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard !clean.isEmpty else { return false }
        do {
            try await loadState(code: clean)
            saveInviteCode(clean)
            connected = true
            errorMessage = nil
            return true
        } catch {
            connected = false
            errorMessage = "Could not join workspace. Check the invite code."
            return false
        }
    }

    func reconnectIfPossible() async {
        guard !savedInviteCode.isEmpty else { return }
        _ = await connect(code: savedInviteCode)
    }

    func refresh() async {
        guard !savedInviteCode.isEmpty else { return }
        do {
            try await loadState(code: savedInviteCode)
            connected = true
            errorMessage = nil
        } catch {
            errorMessage = "Could not refresh right now."
        }
    }

    func disconnect() {
        UserDefaults.standard.removeObject(forKey: "jk.watch.invite")
        sharedDefaults?.removeObject(forKey: "jk.watch.invite")
        assignments = []
        tasks = []
        connected = false
        WidgetCenter.shared.reloadAllTimelines()
    }

    private func saveInviteCode(_ code: String) {
        UserDefaults.standard.set(code, forKey: "jk.watch.invite")
        sharedDefaults?.set(code, forKey: "jk.watch.invite")
    }

    private func loadState(code: String) async throws {
        isLoading = true
        defer { isLoading = false }
        let state: WatchState = try await rpc("app_get_state", body: ["p_code": code])
        assignments = state.assignments
        tasks = state.tasks
        saveWidgetSnapshot()
        WidgetCenter.shared.reloadAllTimelines()
    }

    private func saveWidgetSnapshot() {
        let pending = assignments
            .filter { !$0.done && ($0.dueDate ?? .distantPast) >= Date() }
            .sorted { ($0.dueDate ?? .distantFuture) < ($1.dueDate ?? .distantFuture) }

        let next = pending.first
        let exam = pending.first(where: \.isExam)
        let todayCount = todaysAssignments.count + todaysTasks.count

        let payload: [String: Any] = [
            "updatedAt": Date().timeIntervalSince1970,
            "todayCount": todayCount,
            "nextTitle": next?.title ?? "",
            "nextCourse": next.map { shortCourse($0.course) } ?? "",
            "nextDue": next?.due ?? "",
            "nextID": next?.id ?? "",
            "examTitle": exam?.title ?? "",
            "examCourse": exam.map { shortCourse($0.course) } ?? "",
            "examDue": exam?.due ?? ""
        ]

        if let data = try? JSONSerialization.data(withJSONObject: payload) {
            sharedDefaults?.set(data, forKey: "jk.watch.widget.snapshot")
        }
    }

    func setAssignmentDone(_ item: WatchAssignment, done: Bool) async {
        guard !savedInviteCode.isEmpty else { return }
        do {
            let _: Bool = try await rpc("app_set_assignment_done", body: [
                "p_code": savedInviteCode,
                "p_id": item.id,
                "p_done": done
            ])
            await refresh()
        } catch {
            errorMessage = "Could not update assignment."
        }
    }

    func setTaskDone(_ item: WatchStudyTask, done: Bool) async {
        guard !savedInviteCode.isEmpty else { return }
        do {
            let _: Bool = try await rpc("app_set_task_done", body: [
                "p_code": savedInviteCode,
                "p_id": item.id,
                "p_done": done
            ])
            await refresh()
        } catch {
            errorMessage = "Could not update study task."
        }
    }

    private func rpc<T: Decodable>(_ name: String, body: [String: Any]) async throws -> T {
        guard let url = URL(string: baseURL + name) else { throw URLError(.badURL) }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    var pendingAssignments: [WatchAssignment] {
        assignments.filter { !$0.done && ($0.dueDate ?? .distantPast) >= Date() }
            .sorted { ($0.dueDate ?? .distantFuture) < ($1.dueDate ?? .distantFuture) }
    }

    var nextAssignment: WatchAssignment? { pendingAssignments.first }

    var nextExam: WatchAssignment? {
        pendingAssignments.filter(\.isExam).first
    }

    var todaysAssignments: [WatchAssignment] {
        assignments.filter { item in
            guard !item.done, let due = item.dueDate else { return false }
            return Calendar.current.isDateInToday(due)
        }.sorted { ($0.dueDate ?? .distantFuture) < ($1.dueDate ?? .distantFuture) }
    }

    var todaysTasks: [WatchStudyTask] {
        tasks.filter { item in
            guard !item.done, let date = item.scheduledDate else { return false }
            return Calendar.current.isDateInToday(date)
        }.sorted { ($0.scheduledDate ?? .distantFuture) < ($1.scheduledDate ?? .distantFuture) }
    }
}
