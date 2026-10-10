# J.K Study — Personal Apple Watch Test

This is the lightweight test build for one personal Apple Watch before enrolling in the paid Apple Developer Program.

## What this test build includes

- Today dashboard
- Next assignment
- Exam countdown
- Today's assignments and study tasks
- One-tap assignment completion
- One-tap study-task completion
- 25 / 45 / 60 minute focus timer
- Manual refresh
- Live connection to the same Supabase workspace used by J.K Study Management

## What is intentionally left out

The personal test target does not embed the WidgetKit extension or require the shared App Group. This keeps free Personal Team provisioning as simple as possible. The full project still contains the Next Deadline and Exam Countdown complications / Smart Stack widgets for the later paid/TestFlight release.

## Build the personal test project

On a Mac with Xcode:

1. Install Xcode and sign in with the Apple Account used on the iPhone/Apple Watch.
2. Install XcodeGen (`brew install xcodegen`) or use the generated project from a trusted build machine.
3. In the `watchOS` folder run:

   `xcodegen generate --spec project-personal.yml`

4. Open `JKStudyWatchPersonal.xcodeproj`.
5. Select the `JKStudyWatchPersonal` target → Signing & Capabilities.
6. Turn on Automatically manage signing.
7. Choose the Apple Account's **Personal Team**.
8. Make sure Developer Mode is enabled on the paired iPhone/Apple Watch if Xcode requests it.
9. Select the paired Apple Watch as the run destination and press Run.
10. On first launch, enter the J.K Study workspace invite code.

## Free provisioning notes

A paid Apple Developer Program membership is not required for this personal-device test. Xcode Personal Team provisioning is temporary, so the test app must periodically be rebuilt/reinstalled. It is for personal development/testing only and cannot be distributed through TestFlight or the App Store.

## No-Mac limitation

The source can be validated on GitHub-hosted macOS runners, but installing it on a physical Apple Watch requires Xcode to communicate with the user's paired device. For the first personal-device installation, use a Mac you can physically access (borrowed, school/work lab, or your own). A normal remote cloud Mac cannot automatically see a local Apple Watch.

## Later paid release

When the Apple Developer Program membership is activated, switch back to `project.yml`. That full target includes the WidgetKit extension, shared App Group, Watch complications, and Smart Stack support.
