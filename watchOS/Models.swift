import Foundation

struct WatchState: Decodable {
    let assignments: [WatchAssignment]
    let tasks: [WatchStudyTask]
}

struct WatchAssignment: Decodable, Identifiable, Hashable {
    let id: String
    let title: String
    let course: String
    let due: String
    let done: Bool
    let note: String?

    var dueDate: Date? { DateParser.parse(due) }
    var isExam: Bool { title.range(of: #"\bexam\b"#, options: [.regularExpression, .caseInsensitive]) != nil }
}

struct WatchStudyTask: Decodable, Identifiable, Hashable {
    let id: String
    let title: String
    let course: String
    let minutes: Int
    let done: Bool
    let scheduled_at: String?

    var scheduledDate: Date? { scheduled_at.flatMap(DateParser.parse) }
}

enum DateParser {
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

func shortCourse(_ course: String) -> String {
    if course.hasPrefix("ECO 2210") { return "ECO 2210" }
    if course.hasPrefix("ENG 2211") { return "ENG 2211" }
    if course.hasPrefix("MKT 2000") { return "MKT 2000" }
    if course.hasPrefix("BIO") { return "BIO" }
    return course.components(separatedBy: " - ").first ?? course
}
