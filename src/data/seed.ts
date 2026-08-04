import type { ChartTab, Consult } from '../types'

export const chartTabs: ChartTab[] = [
  'Request',
  'Conditions',
  'Labs',
  'Medications',
  'Notes',
  'Procedures',
  'Vitals',
]

export const consultsSeed: Consult[] = [
  {
    id: 'maya-hrt-start',
    patient: {
      name: 'Maya Patel',
      initials: 'MP',
      age: 52,
      pronouns: 'she/her',
      stage: 'Late perimenopause',
      location: 'Austin, TX',
      lastVisit: 'Apr 28, 2026',
    },
    requestTitle: 'Start estradiol patch for vasomotor symptoms',
    requestType: 'HRT initiation',
    workstream: 'consult',
    receivedAt: 'Today, 4:36 PM',
    waiting: '42 min',
    status: 'Draft ready',
    priority: 'Watch',
    aiReadiness: 92,
    tags: ['VMS', 'Sleep', 'No uterus removed', 'Needs clinician signoff'],
    safetyFlags: ['New migraine aura screen completed', 'Mammogram current'],
    summary:
      'Patient completed an AI-guided menopause intake for hot flashes, night sweats, and sleep disruption. No red-flag bleeding, VTE history, breast cancer history, or uncontrolled hypertension reported.',
    activeProblem: 'Vasomotor symptoms',
    note: `Subjective
Maya, 52F, requests treatment for hot flashes and night sweats that are disrupting sleep 5-6 nights/week. Last menstrual period 7 months ago. Reports waking drenched, daytime fatigue, and difficulty concentrating at work. Tried cooling measures and magnesium without meaningful relief.

Objective
- BP 122/76, HR 74, BMI 24.1 from home cuff intake
- Mammogram 10/2025 BI-RADS 1
- Pap/HPV negative in 2024
- No documented drug allergies
- Uterus present. No postmenopausal bleeding.

Assessment
- Late perimenopause with moderate to severe vasomotor symptoms
- Candidate for transdermal estradiol plus oral micronized progesterone after clinician review
- Safety screen negative for VTE, stroke/TIA, estrogen-dependent cancer, active liver disease, and unexplained vaginal bleeding

Plan
- Start estradiol transdermal patch 0.0375 mg twice weekly
- Start micronized progesterone 100 mg by mouth nightly for endometrial protection
- Counsel on expected onset, breast tenderness, breakthrough bleeding, and when to contact clinic
- Follow up in 6-8 weeks for symptom response and dose adjustment`,
    prescribedMedications: [
      {
        name: 'Estradiol Transdermal Patch 0.0375 MG/24HR',
        status: 'Draft',
        medicationStatus: 'Pending',
        writtenDate: '2026-06-01T16:51:12.125',
        effectiveDate: '2026-06-01',
      },
      {
        name: 'Progesterone Oral Capsule 100 MG',
        status: 'Draft',
        medicationStatus: 'Pending',
        writtenDate: '2026-06-01T16:51:12.125',
        effectiveDate: '2026-06-01',
      },
      {
        name: 'Sertraline Oral Tablet 50 MG',
        status: 'Imported',
        medicationStatus: 'Active',
        writtenDate: '2025-11-12T09:22:18.401',
        effectiveDate: '2025-11-12',
      },
    ],
    ehrMedications: [
      {
        name: 'Sertraline 50 MG Oral Tablet',
        status: 'Active',
        dosageInstructions: 'Take 1 tablet by mouth daily',
        start: '2025-11-12',
        end: '-',
      },
      {
        name: 'Vitamin D3 2000 IU Oral Capsule',
        status: 'Active',
        dosageInstructions: 'Take 1 capsule by mouth daily',
        start: '2025-04-08',
        end: '-',
      },
      {
        name: 'Sumatriptan 50 MG Oral Tablet',
        status: 'PRN',
        dosageInstructions: 'Take 1 tablet at migraine onset; max 2/day',
        start: '2023-08-19',
        end: '-',
      },
    ],
    labs: [
      {
        name: 'TSH',
        value: '1.21 uIU/mL',
        range: '0.45-4.50',
        collected: '2026-05-22',
        status: 'Normal',
      },
      {
        name: 'A1c',
        value: '5.4%',
        range: '4.8-5.6',
        collected: '2026-05-22',
        status: 'Normal',
      },
      {
        name: 'LDL-C',
        value: '118 mg/dL',
        range: '<100',
        collected: '2026-05-22',
        status: 'High',
      },
    ],
    conditions: [
      { name: 'Vasomotor symptoms due to menopause', status: 'Active', onset: '2026-02' },
      { name: 'Migraine without aura', status: 'Active', onset: '2021' },
      { name: 'Generalized anxiety disorder', status: 'Controlled', onset: '2025' },
    ],
    vitals: [
      { name: 'Blood pressure', value: '122/76', date: '2026-05-31' },
      { name: 'Heart rate', value: '74', date: '2026-05-31' },
      { name: 'Weight', value: '143 lb', date: '2026-05-31' },
      { name: 'BMI', value: '24.1', date: '2026-05-31' },
    ],
    agentEvents: [
      {
        id: 'maya-1',
        label: 'Ran intake_triage',
        kind: 'tool',
        body: ['Loaded menopause intake, contraindication screen, medication history, and pharmacy preferences.'],
      },
      {
        id: 'maya-2',
        label: 'Safety analysis',
        kind: 'thinking',
        body: [
          'Vasomotor symptoms are moderate to severe and sleep-disrupting. Safety screen does not show absolute contraindications. Uterus is present, so progesterone is required with systemic estrogen.',
        ],
      },
      {
        id: 'maya-3',
        label: 'Updated request note',
        kind: 'update',
        body: ['Inserted safety checklist, current screening, counseling items, and follow-up interval.'],
      },
      {
        id: 'maya-4',
        label: 'Drafting prescriptions...',
        kind: 'draft',
        body: [
          'Medication ID: estradiol transdermal patch 0.0375 mg twice weekly',
          'Medication ID: progesterone 100 mg capsule nightly',
          'Pharmacy: CVS Pharmacy #1042 (Austin, TX) - from patient saved pharmacies, marked PRIMARY',
          'Patient has no documented medication allergies',
        ],
      },
    ],
    draftOrder: {
      medication: 'Estradiol patch + progesterone',
      sig: 'Apply 1 patch twice weekly; take progesterone 100 mg nightly',
      allergies: 'None on file',
      quantity: '24 patches / 90 capsules',
      refills: '1',
      daysSupply: '84',
      pharmacy: 'CVS Pharmacy #1042',
      notes: 'Start low-dose systemic MHT for VMS. Uterus present; progesterone included.',
      substitutions: 'Allow substitutions',
    },
    actionCards: [],
    chat: [
      {
        id: 'maya-chat-1',
        sender: 'agent',
        name: 'Flourish',
        time: 'Today, 3:50 PM',
        body: [
          'Before I summarize this for the clinician, I will ask about bleeding, clotting history, migraine symptoms, breast cancer history, and current screening.',
        ],
      },
      {
        id: 'maya-chat-2',
        sender: 'patient',
        name: 'Maya',
        time: 'Today, 3:52 PM',
        body: [
          'That sounds good. I am mostly worried about safety because my symptoms are getting hard to ignore.',
        ],
      },
      {
        id: 'maya-chat-3',
        sender: 'agent',
        name: 'Flourish',
        time: 'Today, 3:54 PM',
        body: [
          'Have you ever had a blood clot in the leg or lung, stroke, TIA, breast cancer, active liver disease, or unexplained vaginal bleeding?',
        ],
      },
      {
        id: 'maya-chat-4',
        sender: 'patient',
        name: 'Maya',
        time: 'Today, 3:55 PM',
        body: [
          'No to all of those. My last mammogram was normal in October.',
        ],
      },
      {
        id: 'maya-chat-5',
        sender: 'patient',
        name: 'Maya',
        time: 'Today, 3:58 PM',
        body: [
          'I am waking up soaked most nights and it is affecting work. I want to understand whether a patch is safer than pills.',
        ],
      },
      {
        id: 'maya-chat-6',
        sender: 'agent',
        name: 'Flourish',
        time: 'Today, 3:59 PM',
        body: [
          'I will ask a few safety questions and then summarize everything for clinician review in Bloom.',
        ],
      },
      {
        id: 'maya-chat-7',
        sender: 'patient',
        name: 'Maya',
        time: 'Today, 4:01 PM',
        body: [
          'The hot flashes are worst at night. I wake up around 2 or 3 AM and then I am exhausted the next day.',
        ],
      },
      {
        id: 'maya-chat-8',
        sender: 'agent',
        name: 'Flourish',
        time: 'Today, 4:04 PM',
        body: [
          'I asked about uterus status because systemic estrogen is usually paired with progesterone when the uterus is present.',
        ],
      },
      {
        id: 'maya-chat-9',
        sender: 'patient',
        name: 'Maya',
        time: 'Today, 4:08 PM',
        body: [
          'I still have my uterus. My last period was around seven months ago and I have not had bleeding since.',
        ],
      },
      {
        id: 'maya-chat-10',
        sender: 'agent',
        name: 'Flourish',
        time: 'Today, 4:12 PM',
        body: [
          'You reported no history of blood clots, stroke, breast cancer, active liver disease, or unexplained vaginal bleeding.',
        ],
      },
      {
        id: 'maya-chat-11',
        sender: 'patient',
        name: 'Maya',
        time: 'Today, 4:15 PM',
        body: [
          'I do get migraines, but I do not get aura. I take sumatriptan only when one starts.',
        ],
      },
      {
        id: 'maya-chat-12',
        sender: 'agent',
        name: 'Flourish',
        time: 'Today, 4:18 PM',
        body: [
          'Thanks. I will mark migraine without aura and include that detail for clinician review.',
        ],
      },
      {
        id: 'maya-chat-13',
        sender: 'patient',
        name: 'Maya',
        time: 'Today, 4:20 PM',
        body: [
          'If the doctor thinks it is reasonable, I would prefer the lowest dose that might help me sleep.',
        ],
      },
      {
        id: 'maya-chat-14',
        sender: 'agent',
        name: 'Flourish',
        time: 'Today, 4:21 PM',
        body: [
          'I completed the safety questions and summarized your request for clinician review. A licensed clinician will review before anything is prescribed.',
        ],
      },
      {
        id: 'maya-chat-15',
        sender: 'agent',
        name: 'Flourish',
        time: 'Today, 4:27 PM',
        body: [
          'I added counseling points about expected onset, possible breast tenderness, breakthrough bleeding, and when to contact the clinic.',
        ],
      },
      {
        id: 'maya-chat-16',
        sender: 'patient',
        name: 'Maya',
        time: 'Today, 4:30 PM',
        body: [
          'Thank you. I can wait for the clinician review. I just want to know what to do if bleeding happens.',
        ],
      },
      {
        id: 'maya-chat-17',
        sender: 'agent',
        name: 'Flourish',
        time: 'Today, 4:32 PM',
        body: [
          'I included that question in the draft plan. The clinician can adjust the counseling before anything is sent.',
        ],
      },
      {
        id: 'maya-chat-18',
        sender: 'patient',
        name: 'Maya',
        time: 'Today, 4:35 PM',
        body: [
          'That helps. The sleep piece is the biggest issue for me right now.',
        ],
      },
      {
        id: 'maya-chat-19',
        sender: 'agent',
        name: 'Flourish',
        time: 'Today, 4:36 PM',
        body: [
          'Your request is now in the clinician review queue.',
        ],
      },
    ],
    timeline: [
      {
        id: 'maya-timeline-1',
        time: 'Today, 3:50 PM',
        type: 'chat',
        title: 'AI intake opened',
        detail: 'Agent began structured safety screen for menopausal hormone therapy.',
      },
      {
        id: 'maya-timeline-2',
        time: 'Today, 3:58 PM',
        type: 'chat',
        title: 'Patient started Flourish intake',
        detail: 'Reported 5-6 nights/week of night sweats and asked about patch safety.',
      },
      {
        id: 'maya-timeline-3',
        time: 'Today, 4:08 PM',
        type: 'safety',
        title: 'Uterus status confirmed',
        detail: 'Patient reports uterus present and no bleeding since last menstrual period seven months ago.',
      },
      {
        id: 'maya-timeline-4',
        time: 'Today, 4:18 PM',
        type: 'safety',
        title: 'Contraindication screen completed',
        detail: 'No VTE, breast cancer, stroke/TIA, liver disease, or unexplained bleeding reported.',
      },
      {
        id: 'maya-timeline-5',
        time: 'Today, 4:21 PM',
        type: 'intake',
        title: 'Clinician review summary drafted',
        detail: 'Agent added treatment goals, safety findings, migraine detail, and patient preference for low-dose therapy.',
      },
      {
        id: 'maya-timeline-6',
        time: 'Today, 4:36 PM',
        type: 'intake',
        title: 'AI draft ready for clinician review',
        detail: 'Plan and prescription candidate prepared for transdermal estradiol plus progesterone.',
      },
      {
        id: 'maya-timeline-7',
        time: 'May 22',
        type: 'lab',
        title: 'Recent labs imported',
        detail: 'TSH and A1c normal; LDL mildly elevated.',
      },
      {
        id: 'maya-timeline-8',
        time: 'Apr 28',
        type: 'clinician',
        title: 'Prior sleep counseling reviewed',
        detail: 'Discussed cooling measures, alcohol reduction, and sleep routine; symptoms persisted.',
      },
      {
        id: 'maya-timeline-9',
        time: 'Apr 10',
        type: 'chat',
        title: 'Night sweats first reported',
        detail: 'Patient described waking drenched several times per week with daytime fatigue.',
      },
      {
        id: 'maya-timeline-10',
        time: 'Mar 18',
        type: 'medication',
        title: 'Sertraline list reconciled',
        detail: 'No major interaction concern surfaced in the current seed review.',
      },
      {
        id: 'maya-timeline-11',
        time: 'Jan 2026',
        type: 'clinician',
        title: 'Home blood pressure trend reviewed',
        detail: 'Recent home readings remained in the normal range per patient-entered vitals.',
      },
      {
        id: 'maya-timeline-12',
        time: 'Oct 2025',
        type: 'safety',
        title: 'Mammogram current',
        detail: 'Preventive screening documented as BI-RADS 1 in patient-reported history.',
      },
    ],
    followUps: [
      'Check symptom response and adverse effects in 6-8 weeks',
      'Ask about bleeding pattern after starting progesterone',
      'Review LDL trend with primary care if persistently elevated',
    ],
    internalNotes:
      'AI screen complete. Good candidate for transdermal route if clinician agrees. Watch migraine history language: patient denies aura.',
  },
  {
    id: 'elena-bleeding',
    patient: {
      name: 'Elena Morales',
      initials: 'EM',
      age: 57,
      pronouns: 'she/her',
      stage: 'Postmenopause',
      location: 'Miami, FL',
      lastVisit: 'Jan 18, 2026',
    },
    requestTitle: 'Bleeding after restarting hormone therapy',
    requestType: 'Safety review',
    workstream: 'support',
    receivedAt: 'Today, 3:14 PM',
    waiting: '2 hr',
    status: 'In review',
    priority: 'Urgent',
    aiReadiness: 78,
    tags: ['Bleeding', 'On MHT', 'Needs escalation'],
    safetyFlags: ['Postmenopausal bleeding', 'Hold refill pending clinician review'],
    summary:
      'Patient reports two episodes of spotting after restarting an old estradiol patch prescription. AI agent withheld medication action and queued for clinician review.',
    activeProblem: 'Postmenopausal bleeding',
    note: `Subjective
Elena, 57F, reports postmenopausal spotting twice this week after restarting an old estradiol patch. Menopause occurred at age 51. She has not taken progesterone consistently. No dizziness, syncope, pelvic pain, fever, or heavy bleeding.

Objective
- Home BP 130/78, HR 82
- Last pelvic ultrasound not on file
- Mammogram 2025 BI-RADS 2
- Uterus present

Assessment
- Postmenopausal bleeding while using unopposed systemic estrogen intermittently
- Requires clinician review and diagnostic evaluation before further MHT

Plan
- Do not approve hormone refill today
- Advise patient to stop estradiol patch pending evaluation
- Arrange pelvic ultrasound and gynecology referral
- Give urgent precautions for heavy bleeding, severe pain, dizziness, or syncope`,
    prescribedMedications: [
      {
        name: 'Estradiol Transdermal Patch 0.05 MG/24HR',
        status: 'Hold',
        medicationStatus: 'Paused',
        writtenDate: '2025-09-02T08:20:10.000',
        effectiveDate: '2025-09-02',
      },
    ],
    ehrMedications: [
      {
        name: 'Estradiol Patch 0.05 MG/24HR',
        status: 'Active',
        dosageInstructions: 'Apply 1 patch twice weekly',
        start: '2025-09-02',
        end: '-',
      },
      {
        name: 'Progesterone 100 MG Oral Capsule',
        status: 'Stopped',
        dosageInstructions: 'Take 1 capsule by mouth nightly',
        start: '2025-09-02',
        end: '2025-12-14',
      },
    ],
    labs: [
      {
        name: 'Hemoglobin',
        value: '12.8 g/dL',
        range: '11.1-15.9',
        collected: '2026-01-18',
        status: 'Normal',
      },
      {
        name: 'TSH',
        value: '1.90 uIU/mL',
        range: '0.45-4.50',
        collected: '2026-01-18',
        status: 'Normal',
      },
    ],
    conditions: [
      { name: 'Postmenopausal bleeding', status: 'Active', onset: '2026-06' },
      { name: 'Menopause', status: 'Active', onset: '2020' },
    ],
    vitals: [
      { name: 'Blood pressure', value: '130/78', date: '2026-06-01' },
      { name: 'Heart rate', value: '82', date: '2026-06-01' },
      { name: 'Weight', value: '156 lb', date: '2026-01-18' },
    ],
    agentEvents: [
      {
        id: 'elena-1',
        label: 'Ran bleeding_safety_screen',
        kind: 'tool',
        body: ['Detected postmenopausal bleeding and inconsistent progesterone use with uterus present.'],
      },
      {
        id: 'elena-2',
        label: 'Safety analysis',
        kind: 'thinking',
        body: [
          'This should not route to routine refill. The safest action is to hold hormone refill, create diagnostic plan, and place clinician review at higher priority.',
        ],
      },
      {
        id: 'elena-3',
        label: 'Drafted follow-up',
        kind: 'draft',
        body: ['Prepared patient message with stop-medication guidance and urgent precautions.'],
      },
    ],
    draftOrder: {
      medication: 'No prescription drafted',
      sig: 'Medication action held pending clinician review',
      allergies: 'Penicillin rash',
      quantity: '-',
      refills: '-',
      daysSupply: '-',
      pharmacy: 'Walgreens #2214',
      notes: 'Escalate postmenopausal bleeding evaluation before MHT continuation.',
      substitutions: '-',
    },
    actionCards: [],
    chat: [
      {
        id: 'elena-chat-1',
        sender: 'patient',
        name: 'Elena',
        time: 'Today, 2:51 PM',
        body: ['I saw spotting after I put on a patch again. It is not heavy, but it scared me.'],
      },
    ],
    timeline: [
      {
        id: 'elena-timeline-1',
        time: 'Today, 2:51 PM',
        type: 'chat',
        title: 'Patient reported spotting',
        detail: 'Two episodes of postmenopausal spotting after restarting old estradiol patch.',
      },
      {
        id: 'elena-timeline-2',
        time: 'Today, 3:02 PM',
        type: 'safety',
        title: 'Safety escalation applied',
        detail: 'AI held refill pathway due to postmenopausal bleeding and inconsistent progesterone use.',
      },
      {
        id: 'elena-timeline-3',
        time: 'Today, 3:14 PM',
        type: 'clinician',
        title: 'Queued for urgent review',
        detail: 'Diagnostic plan suggested before any hormone therapy continuation.',
      },
    ],
    followUps: [
      'Send safety message after clinician review',
      'Order pelvic ultrasound if clinician confirms',
      'Schedule gynecology evaluation',
    ],
    internalNotes:
      'High-signal safety case. Do not allow automated refill. Needs diagnostic pathway before MHT discussion resumes.',
  },
  {
    id: 'ruth-gsm',
    patient: {
      name: 'Ruth Kim',
      initials: 'RK',
      age: 61,
      pronouns: 'she/her',
      stage: 'Postmenopause',
      location: 'Portland, OR',
      lastVisit: 'May 12, 2026',
    },
    requestTitle: 'Vaginal estrogen refill for dryness and recurrent UTI symptoms',
    requestType: 'Medication refill',
    workstream: 'consult',
    receivedAt: 'Today, 1:02 PM',
    waiting: '4 hr',
    status: 'Signed',
    priority: 'Routine',
    aiReadiness: 86,
    tags: ['GSM', 'Refill', 'Low-dose vaginal estrogen'],
    safetyFlags: ['No new bleeding', 'Symptoms improved on current therapy'],
    summary:
      'Patient requests refill of low-dose vaginal estradiol cream. AI intake confirms symptom improvement, no bleeding, no breast cancer history, and stable use.',
    activeProblem: 'Genitourinary syndrome of menopause',
    note: `Subjective
Ruth, 61F, requests refill of vaginal estradiol cream for dryness and urinary irritation. Reports strong improvement with twice-weekly maintenance dosing. Denies postmenopausal bleeding, pelvic pain, fever, flank pain, or dysuria today.

Objective
- No documented medication allergies
- Last urine culture in 2025 negative
- Mammogram current per patient report

Assessment
- GSM improved on low-dose vaginal estrogen
- Refill reasonable after clinician review

Plan
- Continue estradiol vaginal cream maintenance dosing twice weekly
- Counsel to report any vaginal bleeding promptly
- Follow up if urinary symptoms recur or worsen`,
    prescribedMedications: [
      {
        name: 'Estradiol Vaginal Cream 0.01%',
        status: 'Ready',
        medicationStatus: 'Active',
        writtenDate: '2026-05-12T12:00:00.000',
        effectiveDate: '2026-05-12',
      },
    ],
    ehrMedications: [
      {
        name: 'Estradiol 0.01% Vaginal Cream',
        status: 'Active',
        dosageInstructions: 'Insert 1 g vaginally twice weekly',
        start: '2025-10-08',
        end: '-',
      },
    ],
    labs: [
      {
        name: 'Urinalysis',
        value: 'Negative nitrite/leukocytes',
        range: 'Negative',
        collected: '2025-12-04',
        status: 'Normal',
      },
    ],
    conditions: [
      { name: 'Genitourinary syndrome of menopause', status: 'Active', onset: '2025' },
    ],
    vitals: [
      { name: 'Blood pressure', value: '118/70', date: '2026-05-12' },
      { name: 'Heart rate', value: '68', date: '2026-05-12' },
    ],
    agentEvents: [
      {
        id: 'ruth-1',
        label: 'Ran refill_safety_check',
        kind: 'tool',
        body: ['No bleeding, no systemic estrogen exposure, symptoms stable, refill pathway available.'],
      },
      {
        id: 'ruth-2',
        label: 'Drafting prescription...',
        kind: 'draft',
        body: ['Prepared estradiol vaginal cream refill and counseling note for clinician review.'],
      },
    ],
    draftOrder: {
      medication: 'Estradiol vaginal cream 0.01%',
      sig: 'Insert 1 g vaginally twice weekly at bedtime',
      allergies: 'None on file',
      quantity: '42.5 g',
      refills: '3',
      daysSupply: '90',
      pharmacy: 'Rite Aid #7741',
      notes: 'Maintenance refill for GSM. Patient denies bleeding.',
      substitutions: 'Allow substitutions',
    },
    actionCards: [],
    chat: [
      {
        id: 'ruth-chat-1',
        sender: 'patient',
        name: 'Ruth',
        time: 'Today, 12:43 PM',
        body: ['The cream has helped a lot. I am almost out and would like to stay on the same dose.'],
      },
    ],
    timeline: [
      {
        id: 'ruth-timeline-1',
        time: 'Today, 12:43 PM',
        type: 'chat',
        title: 'Refill request submitted',
        detail: 'Patient reports strong symptom improvement and wants same maintenance dose.',
      },
      {
        id: 'ruth-timeline-2',
        time: 'Today, 12:58 PM',
        type: 'safety',
        title: 'Refill screen cleared',
        detail: 'No bleeding, systemic estrogen exposure, or new urinary red flags reported.',
      },
      {
        id: 'ruth-timeline-3',
        time: 'Today, 1:02 PM',
        type: 'medication',
        title: 'Low-dose vaginal estrogen refill drafted',
        detail: 'Maintenance refill prepared with bleeding precautions.',
      },
    ],
    followUps: ['Routine annual GSM check-in', 'Ask about bleeding at next refill'],
    internalNotes: 'Straightforward refill if clinician agrees.',
  },
  {
    id: 'talia-sleep',
    patient: {
      name: 'Talia Brooks',
      initials: 'TB',
      age: 49,
      pronouns: 'she/her',
      stage: 'Perimenopause',
      location: 'Brooklyn, NY',
      lastVisit: 'Mar 30, 2026',
    },
    requestTitle: 'Sleep disruption and mood changes before periods',
    requestType: 'Plan review',
    workstream: 'support',
    receivedAt: 'Yesterday, 8:25 PM',
    waiting: '21 hr',
    status: 'In review',
    priority: 'Watch',
    aiReadiness: 81,
    tags: ['Sleep', 'Mood', 'Cycling symptoms'],
    safetyFlags: ['No SI/HI reported', 'PHQ-9 mild range'],
    summary:
      'Patient reports worsening premenstrual sleep disruption, irritability, and night sweats. AI generated a non-prescription plan plus clinician question about SSRI or hormonal options.',
    activeProblem: 'Perimenopausal sleep disruption',
    note: `Subjective
Talia, 49F, reports fragmented sleep and irritability in the 7-10 days before menses. Cycles remain irregular but present. Night sweats occur 2-3 times/week. Denies suicidal ideation, panic symptoms, heavy bleeding, or pregnancy risk.

Objective
- PHQ-9: 6, GAD-7: 7
- BP 116/72
- TSH normal in 2025

Assessment
- Perimenopausal sleep disruption with premenstrual mood symptoms
- Consider behavioral sleep plan, CBT-I resources, and discussion of SSRI or hormonal regulation depending on preferences and contraindications

Plan
- Send sleep plan and symptom tracking template
- Ask patient to complete contraception/pregnancy safety questions before hormone discussion
- Clinician to decide whether to offer visit or asynchronous plan`,
    prescribedMedications: [],
    ehrMedications: [
      {
        name: 'Melatonin 3 MG Oral Tablet',
        status: 'PRN',
        dosageInstructions: 'Take 1 tablet by mouth at bedtime as needed',
        start: '2026-03-30',
        end: '-',
      },
    ],
    labs: [
      {
        name: 'TSH',
        value: '1.60 uIU/mL',
        range: '0.45-4.50',
        collected: '2025-10-10',
        status: 'Normal',
      },
      {
        name: 'Ferritin',
        value: '24 ng/mL',
        range: '15-150',
        collected: '2025-10-10',
        status: 'Normal',
      },
    ],
    conditions: [
      { name: 'Perimenopause', status: 'Active', onset: '2025' },
      { name: 'Insomnia', status: 'Intermittent', onset: '2026' },
    ],
    vitals: [
      { name: 'Blood pressure', value: '116/72', date: '2026-05-31' },
      { name: 'Heart rate', value: '72', date: '2026-05-31' },
      { name: 'Weight', value: '132 lb', date: '2026-03-30' },
    ],
    agentEvents: [
      {
        id: 'talia-1',
        label: 'Ran mood_sleep_screen',
        kind: 'tool',
        body: ['PHQ-9 and GAD-7 reviewed. No self-harm flag. Sleep and cycling symptom pattern extracted.'],
      },
      {
        id: 'talia-2',
        label: 'Care-path analysis',
        kind: 'thinking',
        body: [
          'This can proceed as plan review, but hormone options need pregnancy/contraception confirmation because cycles continue.',
        ],
      },
      {
        id: 'talia-3',
        label: 'Drafted follow-up questions',
        kind: 'draft',
        body: ['Prepared patient questions about cycle timing, contraception, and preference for medication vs behavioral plan.'],
      },
    ],
    draftOrder: {
      medication: 'No medication drafted',
      sig: 'Follow-up questions drafted',
      allergies: 'Sulfa nausea',
      quantity: '-',
      refills: '-',
      daysSupply: '-',
      pharmacy: 'Capsule Brooklyn',
      notes: 'Needs contraception screen before hormonal plan.',
      substitutions: '-',
    },
    actionCards: [],
    chat: [
      {
        id: 'talia-chat-1',
        sender: 'patient',
        name: 'Talia',
        time: 'Yesterday, 8:08 PM',
        body: ['The week before my period I cannot sleep and feel unlike myself. I want to know what options are reasonable.'],
      },
    ],
    timeline: [
      {
        id: 'talia-timeline-1',
        time: 'Yesterday, 8:08 PM',
        type: 'chat',
        title: 'Patient described cyclical sleep and mood symptoms',
        detail: 'Symptoms cluster in 7-10 days before menses with irregular but ongoing cycles.',
      },
      {
        id: 'talia-timeline-2',
        time: 'Yesterday, 8:17 PM',
        type: 'safety',
        title: 'Mood safety screen completed',
        detail: 'PHQ-9 mild range; patient denied suicidal ideation or urgent psychiatric symptoms.',
      },
      {
        id: 'talia-timeline-3',
        time: 'Yesterday, 8:25 PM',
        type: 'intake',
        title: 'Plan review queued',
        detail: 'AI recommends contraception and pregnancy safety clarification before hormonal options.',
      },
    ],
    followUps: [
      'Send contraception and cycle timing questions',
      'Offer clinician visit if mood symptoms worsen',
      'Track night sweats and sleep for 2 cycles',
    ],
    internalNotes: 'Plan review, not urgent. Need complete reproductive safety screen before MHT or OCP discussion.',
  },
]
