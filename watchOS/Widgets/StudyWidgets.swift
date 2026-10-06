import WidgetKit
import SwiftUI
import AppIntents

private enum WidgetConfig {
    static let appGroup = "group.com.jkstudymanagement.shared"
    static let inviteKey = "jk.watch.invite"
    static let snapshotKey = "jk.watch.widget.snapshot"
    static let baseURL = "https://cfiwsgqcoeddqqukgxho.supabase.co/rest/v1/rpc/"
    static let apiKey = "sb_publishable_xExXRjTfzng1z4sa_bsGFg_EQ-ai6RO"
}

private struct WidgetState: Decodable {
    let assignments: [WidgetAssignment]
    let tasks: [WidgetTask]
}

private struct WidgetAssignment: Decodable {
    let id: String
    let title: String
    let course: String
    let due: String
    let done: Bool

    var dueDate: Date? { WidgetDates.parse(due) }
    var isExam: Bool {
        title.range(of: #"\bexam\b"#, options: [.regularExpression, .caseInsensitive]) != nil
    }
}

private struct WidgetTask: Decodable {
    let id: String
    let scheduled_at: String?
    let done: Bool

    var scheduledDate: Date? { scheduled_at.flatMap(WidgetDates.parse) }
}

private struct WidgetSnapshot: Codable {
    let updatedAt: TimeInterval
    let todayCount: Int
    let nextTitle: String
    let nextCourse: String
    let nextDue: String
    let nextID: String
    let examTitle: String
    let examCourse: String
    let examDue: String
}

private enum WidgetDates {
    static let fractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    static let plain: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    static func parse(_ value: String) -> Date? {
        fractional.date(from: value) ?? plain.date(from: value)
    }
}

private func shortCourse(_ course: String) -> String {
    if course.hasPrefix("ECO 2210") { return "ECO 2210" }
    if course.hasPrefix("ENG 2211") { return "ENG 2211" }
    if course.hasPrefix("MKT 2000") { return "MKT 2000" }
    if course.hasPrefix("BIO") { return "BIO" }
    return course.components(separatedBy: " - ").first ?? course
}

private enum SharedWidgetData {
    static var defaults: UserDefaults? { UserDefaults(suiteName: WidgetConfig.appGroup) }

    static var inviteCode: String {
        defaults?.string(forKey: WidgetConfig.inviteKey) ?? ""
    }

    static func cachedSnapshot() -> WidgetSnapshot? {
        guard let data = defaults?.data(forKey: WidgetConfig.snapshotKey) else { return nil }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }

    static func save(_ snapshot: WidgetSnapshot) {
        guard let data = try? JSONEncoder().encode(snapshot) else { return }
        defaults?.set(data, forKey: WidgetConfig.snapshotKey)
    }

    static func rpc<T: Decodable>(_ name: String, body: [String: Any]) async throws -> T {
        guard let url = URL(string: WidgetConfig.baseURL + name) else { throw URLError(.badURL) }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(WidgetConfig.apiKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    static func freshSnapshot() async throws -> WidgetSnapshot {
        let code = inviteCode
        guard !code.isEmpty else { throw URLError(.userAuthenticationRequired) }
        let state: WidgetState = try await rpc("app_get_state", body: ["p_code": code])
        let now = Date()
        let pending = state.assignments
            .filter { !$0.done && ($0.dueDate ?? .distantPast) >= now }
            .sorted { ($0.dueDate ?? .distantFuture) < ($1.dueDate ?? .distantFuture) }
        let next = pending.first
        let exam = pending.first(where: \.isExam)
        let todayAssignments = state.assignments.filter {
            guard !$0.done, let date = $0.dueDate else { return false }
            return Calendar.current.isDateInToday(date)
        }.count
        let todayTasks = state.tasks.filter {
            guard !$0.done, let date = $0.scheduledDate else { return false }
            return Calendar.current.isDateInToday(date)
        }.count

        let snapshot = WidgetSnapshot(
            updatedAt: now.timeIntervalSince1970,
            todayCount: todayAssignments + todayTasks,
            nextTitle: next?.title ?? "",
            nextCourse: next.map { shortCourse($0.course) } ?? "",
            nextDue: next?.due ?? "",
            nextID: next?.id ?? "",
            examTitle: exam?.title ?? "",
            examCourse: exam.map { shortCourse($0.course) } ?? "",
            examDue: exam?.due ?? ""
        )
        save(snapshot)
        return snapshot
    }
}

struct StudyWidgetEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?

    static let placeholder = StudyWidgetEntry(
        date: Date(),
        snapshot: WidgetSnapshot(
            updatedAt: Date().timeIntervalSince1970,
            todayCount: 3,
            nextTitle: "Chapter 8 Homework",
            nextCourse: "ECO 2210",
            nextDue: ISO8601DateFormatter().string(from: Date().addingTimeInterval(7200)),
            nextID: "",
            examTitle: "Exam 3",
            examCourse: "ECO 2210",
            examDue: ISO8601DateFormatter().string(from: Date().addingTimeInterval(3 * 86400))
        )
    )
}

struct StudyTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> StudyWidgetEntry { .placeholder }

    func getSnapshot(in context: Context, completion: @escaping (StudyWidgetEntry) -> Void) {
        completion(StudyWidgetEntry(date: Date(), snapshot: SharedWidgetData.cachedSnapshot() ?? StudyWidgetEntry.placeholder.snapshot))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StudyWidgetEntry>) -> Void) {
        Task {
            let snapshot: WidgetSnapshot?
            do {
                snapshot = try await SharedWidgetData.freshSnapshot()
            } catch {
                snapshot = SharedWidgetData.cachedSnapshot()
            }
            let entry = StudyWidgetEntry(date: Date(), snapshot: snapshot)
            let nextRefresh = Date().addingTimeInterval(15 * 60)
            completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
        }
    }
}

struct CompleteAssignmentIntent: AppIntent {
    static var title: LocalizedStringResource = "Complete assignment"
    static var description = IntentDescription("Marks the selected study assignment complete.")
    static var openAppWhenRun = false

    @Parameter(title: "Assignment ID")
    var assignmentID: String

    init() {
        assignmentID = ""
    }

    init(assignmentID: String) {
        self.assignmentID = assignmentID
    }

    func perform() async throws -> some IntentResult {
        let code = SharedWidgetData.inviteCode
        guard !code.isEmpty, !assignmentID.isEmpty else { return .result() }
        let _: Bool = try await SharedWidgetData.rpc("app_set_assignment_done", body: [
            "p_code": code,
            "p_id": assignmentID,
            "p_done": true
        ])
        _ = try? await SharedWidgetData.freshSnapshot()
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

struct NextDeadlineWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: StudyWidgetEntry

    private var snapshot: WidgetSnapshot? { entry.snapshot }
    private var dueDate: Date? { snapshot.flatMap { WidgetDates.parse($0.nextDue) } }

    @ViewBuilder
    var body: some View {
        if let item = snapshot, !item.nextTitle.isEmpty {
            switch family {
            case .accessoryInline:
                Text("\(item.nextCourse): \(item.nextTitle)")
            case .accessoryCircular:
                VStack(spacing: 1) {
                    Image(systemName: "graduationcap.fill")
                    Text("\(item.todayCount)")
                        .font(.headline)
                    Text("today")
                        .font(.system(size: 8))
                }
            case .accessoryCorner:
                ZStack {
                    Image(systemName: "book.closed.fill")
                    AccessoryWidgetBackground()
                }
                .widgetLabel {
                    if let dueDate { Text(dueDate, style: .relative) }
                    else { Text(item.nextCourse) }
                }
            default:
                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text(item.nextCourse)
                            .font(.caption2.bold())
                        Spacer()
                        Text("\(item.todayCount) today")
                            .font(.caption2)
                    }
                    Text(item.nextTitle)
                        .font(.caption.bold())
                        .lineLimit(2)
                    HStack {
                        if let dueDate {
                            Text(dueDate, style: .relative)
                                .font(.caption2)
                        }
                        Spacer()
                        if !item.nextID.isEmpty {
                            Button(intent: CompleteAssignmentIntent(assignmentID: item.nextID)) {
                                Image(systemName: "checkmark.circle.fill")
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        } else {
            VStack(spacing: 3) {
                Image(systemName: "checkmark.seal.fill")
                Text("All caught up")
                    .font(.caption.bold())
            }
        }
    }
}

struct ExamCountdownWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: StudyWidgetEntry

    private var snapshot: WidgetSnapshot? { entry.snapshot }
    private var examDate: Date? { snapshot.flatMap { WidgetDates.parse($0.examDue) } }
    private var days: Int? {
        guard let examDate else { return nil }
        return max(0, Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: Date()), to: Calendar.current.startOfDay(for: examDate)).day ?? 0)
    }

    @ViewBuilder
    var body: some View {
        if let item = snapshot, !item.examTitle.isEmpty {
            switch family {
            case .accessoryInline:
                Text("Exam: \(item.examCourse) • \(days ?? 0)d")
            case .accessoryCircular:
                VStack(spacing: 0) {
                    Text("\(days ?? 0)")
                        .font(.title3.bold())
                    Text("days")
                        .font(.system(size: 8))
                }
            case .accessoryCorner:
                Text("\(days ?? 0)")
                    .font(.headline)
                    .widgetLabel { Text(item.examCourse) }
            default:
                VStack(alignment: .leading, spacing: 4) {
                    Text("🎓 \(item.examCourse)")
                        .font(.caption2.bold())
                    Text(item.examTitle)
                        .font(.caption.bold())
                        .lineLimit(1)
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text("\(days ?? 0)")
                            .font(.title2.bold())
                        Text(days == 1 ? "day left" : "days left")
                            .font(.caption2)
                    }
                }
            }
        } else {
            VStack(spacing: 3) {
                Image(systemName: "calendar.badge.checkmark")
                Text("No exam")
                    .font(.caption.bold())
            }
        }
    }
}

struct NextDeadlineWidget: Widget {
    let kind = "JKNextDeadline"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StudyTimelineProvider()) { entry in
            NextDeadlineWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Next Deadline")
        .description("Shows the next assignment and today's workload.")
        .supportedFamilies([.accessoryInline, .accessoryCircular, .accessoryRectangular, .accessoryCorner])
    }
}

struct ExamCountdownWidget: Widget {
    let kind = "JKExamCountdown"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StudyTimelineProvider()) { entry in
            ExamCountdownWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Exam Countdown")
        .description("Keeps your nearest exam visible on Apple Watch.")
        .supportedFamilies([.accessoryInline, .accessoryCircular, .accessoryRectangular, .accessoryCorner])
    }
}

@main
struct JKStudyWidgetBundle: WidgetBundle {
    var body: some Widget {
        NextDeadlineWidget()
        ExamCountdownWidget()
    }
}
