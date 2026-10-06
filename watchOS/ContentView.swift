import SwiftUI

struct ContentView: View {
    @StateObject private var store = StudyStore()
    @State private var inviteCode = ""

    var body: some View {
        Group {
            if store.connected {
                WatchHomeView(store: store)
            } else {
                ConnectWorkspaceView(store: store, inviteCode: $inviteCode)
            }
        }
        .task {
            inviteCode = store.savedInviteCode
            await store.reconnectIfPossible()
        }
    }
}

struct ConnectWorkspaceView: View {
    @ObservedObject var store: StudyStore
    @Binding var inviteCode: String

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                Image(systemName: "graduationcap.fill")
                    .font(.system(size: 30))
                    .foregroundStyle(.green)
                Text("J.K Study")
                    .font(.headline)
                Text("Enter your shared workspace invite code once.")
                    .font(.caption2)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)

                TextField("Invite code", text: $inviteCode)
                    .textInputAutocapitalization(.characters)

                Button("Join Workspace") {
                    Task { _ = await store.connect(code: inviteCode) }
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)

                if store.isLoading {
                    ProgressView()
                }
                if let error = store.errorMessage {
                    Text(error)
                        .font(.caption2)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }
            }
            .padding(.horizontal, 4)
        }
    }
}

struct WatchHomeView: View {
    @ObservedObject var store: StudyStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        VStack(alignment: .leading, spacing: 1) {
                            Text("J.K Study")
                                .font(.headline)
                            Text(Date.now, format: .dateTime.weekday(.abbreviated).month(.abbreviated).day())
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button {
                            Task { await store.refresh() }
                        } label: {
                            Image(systemName: "arrow.clockwise")
                        }
                        .buttonStyle(.plain)
                    }

                    TodaySummaryCard(store: store)

                    if let next = store.nextAssignment {
                        NavigationLink {
                            AssignmentDetailView(store: store, assignment: next)
                        } label: {
                            NextUpCard(assignment: next)
                        }
                        .buttonStyle(.plain)
                    }

                    if let exam = store.nextExam {
                        NavigationLink {
                            AssignmentDetailView(store: store, assignment: exam)
                        } label: {
                            ExamCard(exam: exam)
                        }
                        .buttonStyle(.plain)
                    }

                    NavigationLink {
                        TodayListView(store: store)
                    } label: {
                        Label("Today's Work", systemImage: "checklist")
                    }

                    NavigationLink {
                        FocusPickerView()
                    } label: {
                        Label("Focus Timer", systemImage: "timer")
                    }

                    NavigationLink {
                        WatchSettingsView(store: store)
                    } label: {
                        Label("Settings", systemImage: "gearshape")
                    }

                    if let error = store.errorMessage {
                        Text(error)
                            .font(.caption2)
                            .foregroundStyle(.orange)
                    }
                }
            }
            .navigationTitle("")
        }
    }
}

struct TodaySummaryCard: View {
    @ObservedObject var store: StudyStore
    var total: Int { store.todaysAssignments.count + store.todaysTasks.count }

    var body: some View {
        HStack {
            ZStack {
                Circle().stroke(.green.opacity(0.25), lineWidth: 5)
                Circle()
                    .trim(from: 0, to: total == 0 ? 1 : 0.72)
                    .stroke(.green, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text("\(total)")
                    .font(.headline)
            }
            .frame(width: 45, height: 45)

            VStack(alignment: .leading, spacing: 2) {
                Text(total == 0 ? "All clear" : "Today")
                    .font(.headline)
                Text(total == 1 ? "1 item remaining" : "\(total) items remaining")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(10)
        .background(.green.opacity(0.12), in: RoundedRectangle(cornerRadius: 14))
    }
}

struct NextUpCard: View {
    let assignment: WatchAssignment

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack {
                Text("NEXT UP")
                    .font(.caption2.bold())
                    .foregroundStyle(.secondary)
                Spacer()
                Text(shortCourse(assignment.course))
                    .font(.caption2.bold())
                    .foregroundStyle(subjectColor(assignment.course))
            }
            Text(assignment.title)
                .font(.headline)
                .lineLimit(2)
            if let due = assignment.dueDate {
                Text(countdown(to: due) + " • " + due.formatted(date: .omitted, time: .shortened))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(10)
        .background(subjectColor(assignment.course).opacity(0.14), in: RoundedRectangle(cornerRadius: 14))
    }
}

struct ExamCard: View {
    let exam: WatchAssignment

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Label("Exam Countdown", systemImage: "graduationcap.fill")
                .font(.caption.bold())
            Text(exam.title)
                .font(.subheadline.bold())
                .lineLimit(1)
            if let due = exam.dueDate {
                Text(countdown(to: due))
                    .font(.title3.bold())
                    .foregroundStyle(.orange)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(.orange.opacity(0.13), in: RoundedRectangle(cornerRadius: 14))
    }
}

struct TodayListView: View {
    @ObservedObject var store: StudyStore

    var body: some View {
        List {
            if store.todaysAssignments.isEmpty && store.todaysTasks.isEmpty {
                Text("Nothing scheduled for today 🎉")
                    .font(.caption)
            }

            ForEach(store.todaysAssignments) { item in
                VStack(alignment: .leading, spacing: 5) {
                    Text(shortCourse(item.course))
                        .font(.caption2.bold())
                        .foregroundStyle(subjectColor(item.course))
                    Text(item.title)
                        .font(.caption)
                    Button("✓ Complete") {
                        Task { await store.setAssignmentDone(item, done: true) }
                    }
                    .font(.caption2)
                    .tint(.green)
                }
            }

            ForEach(store.todaysTasks) { item in
                VStack(alignment: .leading, spacing: 5) {
                    Text("Study • \(shortCourse(item.course))")
                        .font(.caption2.bold())
                        .foregroundStyle(.blue)
                    Text(item.title)
                        .font(.caption)
                    Text("\(item.minutes) min")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Button("✓ Complete") {
                        Task { await store.setTaskDone(item, done: true) }
                    }
                    .font(.caption2)
                    .tint(.green)
                }
            }
        }
        .navigationTitle("Today")
    }
}

struct AssignmentDetailView: View {
    @ObservedObject var store: StudyStore
    let assignment: WatchAssignment

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                Text(shortCourse(assignment.course))
                    .font(.caption.bold())
                    .foregroundStyle(subjectColor(assignment.course))
                Text(assignment.title)
                    .font(.headline)
                if let due = assignment.dueDate {
                    Label(due.formatted(date: .abbreviated, time: .shortened), systemImage: "calendar")
                        .font(.caption2)
                    Text(countdown(to: due))
                        .font(.title3.bold())
                        .foregroundStyle(.orange)
                }
                if let note = assignment.note, !note.isEmpty {
                    Text(note)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Button("Mark Complete") {
                    Task { await store.setAssignmentDone(assignment, done: true) }
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
            }
        }
        .navigationTitle("Assignment")
    }
}

struct WatchSettingsView: View {
    @ObservedObject var store: StudyStore

    var body: some View {
        List {
            Section("Workspace") {
                Text("Shared data is synced with J.K Study Management.")
                    .font(.caption2)
                Button("Refresh now") {
                    Task { await store.refresh() }
                }
            }
            Section {
                Button("Disconnect Watch", role: .destructive) {
                    store.disconnect()
                }
            }
        }
        .navigationTitle("Settings")
    }
}

func subjectColor(_ course: String) -> Color {
    if course.hasPrefix("ECO") { return .green }
    if course.hasPrefix("ENG") { return .blue }
    if course.hasPrefix("MKT") { return .orange }
    if course.hasPrefix("BIO") { return .purple }
    return .gray
}

func countdown(to date: Date) -> String {
    let seconds = max(0, date.timeIntervalSinceNow)
    let days = Int(seconds / 86400)
    let hours = Int(seconds.truncatingRemainder(dividingBy: 86400) / 3600)
    if days > 0 { return days == 1 ? "1 day left" : "\(days) days left" }
    if hours > 0 { return hours == 1 ? "1 hour left" : "\(hours) hours left" }
    let minutes = max(1, Int(seconds / 60))
    return "\(minutes) min left"
}
