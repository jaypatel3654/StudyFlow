import SwiftUI
import Combine

struct FocusPickerView: View {
    var body: some View {
        List {
            Section("Choose a session") {
                NavigationLink("25 min Focus") { FocusTimerView(minutes: 25) }
                NavigationLink("45 min Focus") { FocusTimerView(minutes: 45) }
                NavigationLink("60 min Focus") { FocusTimerView(minutes: 60) }
            }
        }
        .navigationTitle("Focus")
    }
}

struct FocusTimerView: View {
    let minutes: Int
    @State private var remaining: Int
    @State private var running = false
    @State private var finished = false

    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    init(minutes: Int) {
        self.minutes = minutes
        _remaining = State(initialValue: minutes * 60)
    }

    var body: some View {
        VStack(spacing: 10) {
            ZStack {
                Circle()
                    .stroke(.green.opacity(0.22), lineWidth: 8)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(.green, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                VStack(spacing: 1) {
                    Text(timeText)
                        .font(.title2.monospacedDigit().bold())
                    Text(finished ? "Complete" : "Focus")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(width: 110, height: 110)

            Button(running ? "Pause" : (finished ? "Restart" : "Start")) {
                if finished {
                    remaining = minutes * 60
                    finished = false
                    running = true
                } else {
                    running.toggle()
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(.green)

            if remaining < minutes * 60 && !finished {
                Button("Reset") {
                    running = false
                    remaining = minutes * 60
                }
                .font(.caption2)
            }
        }
        .navigationTitle("Focus Timer")
        .onReceive(timer) { _ in
            guard running, remaining > 0 else { return }
            remaining -= 1
            if remaining == 0 {
                running = false
                finished = true
            }
        }
    }

    private var progress: Double {
        guard minutes > 0 else { return 0 }
        return 1 - Double(remaining) / Double(minutes * 60)
    }

    private var timeText: String {
        String(format: "%02d:%02d", remaining / 60, remaining % 60)
    }
}
