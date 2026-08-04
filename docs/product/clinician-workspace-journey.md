# Bloom Clinician Workspace Journey

Bloom is a role-based EMR workspace for asynchronous consult review, prescription work, patient clarification, and practice operations. This document focuses on two initial user types:

- Clinician: reviews incoming consults, resolves prescriptions, messages patients when needed, and completes notes/orders.
- Clinician admin: can do the same clinical work, plus manage the practice, clinicians, patients, queue health, reporting, and outcomes.

## Product Principle

The clinician should land as close as possible to the next patient action. Bloom should not make a clinician pass through a generic dashboard before starting the day's work.

The clinician-admin needs a second workspace for management work, but their clinical workflow should remain the same. Admin capabilities should not clutter the consult review surface.

## Login And Routing

### Login Screen

The login screen should be simple and role-neutral:

- Bloom brand.
- Email/password or magic-link entry.
- Optional SSO later for larger practices.
- Forgot password.
- Clear environment labeling only in non-production builds.

The login screen should not ask the user to choose a role. Role and workspace access should come from the account.

### Post-Login Routing

After authentication, route by the user's available workspaces:

| User access | Default destination | Secondary access |
| --- | --- | --- |
| Clinician only | Clinician queue | None |
| Clinician admin | Clinician queue | Practice workspace from account menu |
| Practice manager only, if added later | Practice workspace | No chart-signing actions |

For dual-role users, the workspace switcher belongs in the account menu. The primary queue/chart chrome should stay focused on care delivery.

In this iteration, clinicians do not have individually assigned patient loads. Patients roll into a shared practice queue. A clinician can see the full practice queue but should primarily work by filtering to the state or states where they are currently licensed and operating.

## Clinician Journey

### Core Jobs

- See active consults that need review.
- Understand patient context quickly.
- Review intake, chat, conditions, labs, medications, notes, procedures, and vitals.
- Use the copilot to draft plans or prescriptions.
- Insert dot phrases into the clinical note for commonly used documentation.
- Create and manage personal dot phrases for repeated note language.
- Send a message to the patient when clarification is needed.
- Review a patient response when it comes back.
- Complete the note and sign/complete the consult.
- Return to recent or signed consults when needed.

### Default First Screen

The default first screen should be the active queue:

- Left: shared consult queue with state filters, patient search, and consult-type filtering.
- Center: selected consult chart.
- Right: copilot, chat history, follow-ups, or prescription console.

State filtering is central to the clinical workflow. A clinician may be licensed in multiple states and should be able to select one state, multiple states, or all states when working the queue. The state filter should reflect where the patient can be seen, not a clinician-owned assignment bucket.

The queue should be ordered by clinical actionability, not just creation time. A reasonable starting order:

1. Patient responses waiting for clinician review.
2. Consults already in review.
3. Submitted consults waiting longest.
4. Follow-up consults.

### Clinician Home Screen

A clinician home screen is optional. If it exists, it should be a work launchpad, not a broad analytics dashboard.

Useful clinician home modules:

- Queue snapshot: in review, patient replied, awaiting response, signed/completed today.
- Recent cases: recently opened, signed, completed, or still open, with status pills.
- Personal month snapshot: completed consult count and consult-type mix.
- Patient search.

Recommendation: do not make this the default landing page for clinicians. It is mainly an activity snapshot and recovery surface. If added, access it from a small "Home" or "Today" entry in the account/menu area or queue chrome, while the default post-login destination remains the queue.

## Clinician-Admin Journey

The clinician-admin has two modes:

- Clinical mode: same as clinician.
- Practice mode: operational management, reporting, clinician management, and patient oversight.

### Practice Workspace Jobs

- See what is happening in the practice today.
- Monitor queue health and backlog.
- Understand clinician throughput and workload.
- Manage clinicians and role access.
- Review patient volume and lifecycle.
- Track clinical outcomes over time.
- Run reports for operations, quality, research, and finance.
- Investigate cases that are delayed, escalated, or reopened.

### Practice Workspace First Screen

The first practice workspace should answer: "What needs attention in the practice today?"

Initial modules:

- Today volume: new patients, new consults, follow-up consults, total consults.
- Queue health: in review, patient replied, awaiting response, signed/completed.
- SLA health: median time to first review, median time to completion, consults past target.
- State coverage: volume and queue state by patient state.
- Clinician activity: completed today, completed this month, consult-type mix, and estimated payout based on completed consult count.

The admin surface should favor operational facts before performance comparison. Clinician performance can exist, but it should not be the only frame.

## Admin Use Cases

### Practice Management

- Invite, deactivate, and manage clinicians.
- Assign roles: clinician, clinician admin, practice manager, MA.
- Manage which patient states Bloom is actively serving.
- View clinician state coverage so admins know which clinicians can work which state-filtered queues.
- View audit activity for chart access and signing.
- Manage practice-level settings such as SLA targets and notification rules.

### Clinician Management

- View queue volume by patient state and consult type.
- See completion volume by clinician.
- See median review and completion time by clinician for admin reporting.
- Review which clinicians are active in which state-filtered queues.
- Review quality samples later, if required.

### Patient Management

- Search patients across the practice.
- View patient status: in review, awaiting response, signed/completed.
- See whether a consult is a new consult or follow-up consult.
- See recent consult history and unresolved actions.
- Reopen or route a patient back into the queue when needed.

### Analytics And Reporting

Operational analytics:

- How many patients are we seeing?
- How many consults are new vs follow-up?
- How long does it take for a patient to be seen?
- How long does it take to complete a consult?
- How many minutes per consult does the clinician spend?
- Where are consults getting stuck?

Financial analytics:

- Completed consults this month.
- Completed consults by clinician, consult type, and patient cohort.
- Payout estimate by clinician based on completed consult count.

Clinical outcomes and research:

- Symptom score change from intake to follow-up.
- Sleep score change from intake to follow-up.
- Sexual health score change from intake to follow-up.
- Hot flash index change from intake to follow-up.
- Depression and anxiety screen change from intake to follow-up.

## Patient Clarification Loop

Clinicians need a way to ask patients clarifying questions before completing a consult.

### Case States

Add states that separate clinical work from waiting:

- In review: patient submitted the consult for clinician review, or the clinician is actively working it.
- Awaiting response: clinician or MA sent the patient a clarification message and Bloom is waiting on the patient.
- Patient replied: patient response is back and requires clinician review.
- Signed/completed: clinician finished the note, plan, and any prescription work in one closing action.

Avoid "New" as a case status because it is ambiguous with new patients and new consult types. Use consult type pills such as "New consult" and "Follow-up consult" separately from the global case status.

### Clinician Flow

1. Clinician opens a consult.
2. Clinician decides information is missing.
3. Clinician clicks "Message patient" from the chart or chat history.
4. Bloom suggests a concise question using chart context, but clinician edits and sends it.
5. Case moves to Awaiting response.
6. Case leaves the primary In review list, but remains searchable and visible in an "Awaiting response" filter.
7. Patient replies.
8. Case moves to Patient replied and returns near the top of the queue.
9. Clinician reviews the response, inserts relevant excerpt into the note if useful, and completes the consult.

MAs can help manage patient clarification messages. They may send operational clarification messages or help route responses, while clinical signing and prescribing remain clinician actions.

### Patient Experience

The patient should receive the question in the same patient-facing conversation context they already used for intake.

Patient-facing requirements:

- Clear clinician name and practice identity.
- One or more specific questions.
- Ability to answer asynchronously.
- Confirmation that the response was sent.
- No implication that the consult is complete until the clinician finishes it.

### Queue Behavior

The queue needs explicit buckets or filters:

- In review.
- Patient replied.
- Awaiting response.
- Signed/completed.

For the clinician's default list, Patient replied should be treated as the most actionable work. Awaiting response should remain visible through filters and search, but should not crowd the default active queue.

## Dot Phrases

Clinicians need a fast way to insert commonly used documentation into the note editor.

### Editor Behavior

When the clinician types `.` in the note editor, Bloom should surface a dot phrase menu near the cursor.

The menu should support:

- Searching by shortcut and phrase title.
- Keyboard navigation.
- Previewing the phrase content.
- Inserting the selected phrase into the note at the cursor.
- Dismissing the menu without changing the note.

Example shortcuts:

- `.hrtstart`
- `.bleedingprecautions`
- `.vagestrogen`
- `.followup6w`
- `.normalmammogram`

The inserted phrase should become normal editable note text after insertion. It should not remain a locked component.

### Phrase Management

Both clinicians and clinician admins can create, edit, and delete their own dot phrases.

A first version can support personal dot phrases only:

- Phrase shortcut.
- Phrase title.
- Phrase body.
- Optional category.
- Last updated timestamp.

Later, clinician admins may also manage shared practice dot phrases if the practice wants standardized language. Shared practice phrases should be visually distinguishable from personal phrases in the picker.

### Access Point

Dot phrase management can live in clinician settings or a compact "Dot phrases" settings view. It should not require leaving the active consult to use an existing phrase.

The note editor should be the main usage surface; settings should only be for managing the phrase library.

## Data Primitives To Add

### User And Role

- user_id
- practice_id
- role: clinician, clinician_admin, practice_manager, MA
- clinical_permissions: review_consults, sign_orders, prescribe
- admin_permissions: manage_users, view_practice_analytics, export_reports
- licensed_states
- dot_phrase_permissions: create_personal, manage_practice
- default_workspace
- available_workspaces

### Consult Assignment And State

- consult_id
- patient_id
- practice_id
- patient_state
- last_clinician_id
- workstream: consult, support, refill, follow_up
- consult_type: new_consult, follow_up_consult
- status
- priority
- received_at
- first_opened_at
- last_clinician_action_at
- waiting_on: clinician, patient, pharmacy, system, none
- completed_at
- signed_at

### Patient Messaging

- message_thread_id
- consult_id
- sender_type: patient, clinician, system, agent
- sender_id
- body
- sent_at
- read_at
- response_required
- response_due_at

### Dot Phrase

- dot_phrase_id
- owner_user_id
- practice_id
- scope: personal, practice
- shortcut
- title
- body
- category
- created_at
- updated_at
- archived_at

### Reporting Events

- consult_created
- consult_opened
- message_sent_to_patient
- patient_replied
- plan_drafted
- prescription_drafted
- prescription_signed
- consult_completed
- dot_phrase_inserted
- dot_phrase_created
- dot_phrase_updated

Keep clinician-facing timing silent. Timing data should feed admin analytics without adding visible timers to the clinical workspace.

## Build Sequence

### Now

- Keep clinician login routing directly to the current queue.
- Add role/workspace model in product terms.
- Make state filtering a first-class queue primitive.
- Add patient-message case states to the design model.
- Preserve current queue/chart/copilot surface as the clinician workspace.

### Next

- Add a lightweight login screen and post-login router.
- Add account-menu workspace switching for dual-role users.
- Add queue filters for Patient replied and Awaiting response.
- Add a Message patient action from the chart or chat history.
- Add consult-type pills for New consult and Follow-up consult.
- Add dot phrase insertion in the note editor.
- Add personal dot phrase management in settings.

### Later

- Build the practice workspace.
- Add clinician management around state coverage and completed consult volume.
- Add practice operations dashboard.
- Add shared practice dot phrases if clinician admins need standardized documentation language.
- Add outcomes reporting.
- Add financial reporting.
- Add report export and research cohorts.

## Open Questions

- What should the exact state selector interaction be for clinicians licensed in multiple states: single-select, multi-select, or saved state presets?
- Should clinician admins see payout estimates only in the practice workspace, or also in clinician profile pages?
- Which clarification messages can MAs send directly versus draft for clinician review?
- Should clinician admins be able to create shared practice dot phrases in the first version, or should the first version be personal phrases only?
- Which intake score definitions and thresholds should power the sleep, sexual health, hot flash, depression, and anxiety outcome reports?
