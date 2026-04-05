// ─── Know Your Rights — Static Content ────────────────────────────────────────
// All phone numbers, emails and URLs are used with Linking.openURL in TopicDetailScreen.

export const RIGHTS_TOPICS = [
  {
    id: 'deposits',
    title: 'Deposits',
    icon: 'cash-outline',
    summary: 'Your deposit must be protected by law. Know how to get it back.',
    sections: [
      {
        heading: 'The rules',
        body: 'Your landlord must register your deposit in a government-approved scheme within 30 days of payment, and give you written proof of which scheme they used.',
      },
      {
        heading: 'The three approved schemes',
        body: 'Deposit Protection Service (DPS), myDeposits, and Tenancy Deposit Scheme (TDS). All offer free dispute resolution for tenants.',
      },
      {
        heading: 'Deductions',
        body: "Landlords can only deduct for actual damage beyond normal wear and tear. Faded paint, worn carpet, and general ageing are NOT valid deductions.",
      },
      {
        heading: 'If your deposit is not protected',
        body: "Your landlord cannot evict you using standard 'no-fault' grounds. You can also claim compensation of 1–3× the deposit amount through the county court.",
      },
      {
        heading: 'Top tip',
        body: 'Take timestamped photos and video of every room on move-in day. Store them in the cloud. This is your best protection against unfair deductions.',
        isTip: true,
      },
    ],
    contacts: [
      { label: 'Check your deposit: Deposit Protection Service', type: 'web', value: 'https://www.depositprotection.com' },
      { label: 'Check your deposit: myDeposits', type: 'web', value: 'https://www.mydeposits.co.uk' },
      { label: 'Check your deposit: TDS', type: 'web', value: 'https://www.tenancydepositscheme.com' },
      { label: 'DPS helpline', type: 'phone', value: 'tel:03303030030' },
      { label: 'myDeposits helpline', type: 'phone', value: 'tel:03333219401' },
      { label: 'TDS helpline', type: 'phone', value: 'tel:03000371000' },
    ],
  },
  {
    id: 'repairs',
    title: 'Repairs & Maintenance',
    icon: 'construct-outline',
    summary: 'Your landlord is legally responsible for keeping your home safe and habitable.',
    sections: [
      {
        heading: "Your landlord's responsibilities",
        body: "Landlords must maintain: the structure and exterior (walls, roof, windows, doors), plumbing (sinks, baths, toilets, pipes), heating and hot water, gas appliances, and electrical safety.",
      },
      {
        heading: 'Your responsibilities',
        body: 'You are responsible for minor tasks like replacing lightbulbs and keeping the property reasonably clean. You must also report problems promptly in writing.',
      },
      {
        heading: 'Mould and damp',
        body: 'Landlords often try to blame tenants for condensation mould. Document everything with photos and dates before they make this claim. Under Awaab\'s Law, landlords must respond to and fix damp/mould hazards promptly.',
      },
      {
        heading: 'What to do if your landlord ignores repairs',
        body: '1. Report the issue in writing (text or email) and keep a copy.\n2. Follow up in writing after 14 days.\n3. Contact Exeter City Council Private Sector Housing.\n4. The council can inspect the property and formally order repairs.',
        isSteps: true,
      },
    ],
    contacts: [
      { label: 'Exeter City Council Housing Team', type: 'phone', value: 'tel:01392277888' },
      { label: 'Email Exeter City Council', type: 'email', value: 'mailto:environmental.health@exeter.gov.uk' },
    ],
  },
  {
    id: 'hmo',
    title: 'HMO Rules',
    icon: 'home-outline',
    summary: 'Most Exeter student houses are HMOs. Your landlord must meet strict legal standards.',
    sections: [
      {
        heading: 'What is an HMO?',
        body: 'A House in Multiple Occupation (HMO) is any property occupied by 3 or more people from more than one household who share facilities like a kitchen or bathroom. Most student houses qualify.',
      },
      {
        heading: 'Licensing',
        body: 'Large HMOs (5+ occupants) must be licensed by Exeter City Council. Your landlord is responsible for obtaining this licence — you do not need to do anything.',
      },
      {
        heading: 'What your landlord must have',
        body: '• Annual gas safety certificate\n• Electrical installation inspection certificate\n• Working smoke alarms on every floor\n• Fire doors where required\n• Each bedroom must be at least 6.51 m²',
      },
      {
        heading: 'If your HMO is unlicensed',
        body: 'You may be entitled to up to 12 months of paid rent back through a Rent Repayment Order (RRO) via the First-tier Tribunal. Contact Guild Advice for help applying.',
      },
    ],
    contacts: [
      { label: 'Check HMO licence: Exeter City Council', type: 'phone', value: 'tel:01392277888' },
      { label: 'First-tier Tribunal (Rent Repayment Orders)', type: 'web', value: 'https://www.gov.uk/housing-tribunal' },
    ],
  },
  {
    id: 'eviction',
    title: 'Eviction & The New Law',
    icon: 'shield-outline',
    summary: "The biggest change to renting in 30 years. Section 21 'no-fault' evictions are abolished.",
    sections: [
      {
        heading: 'The Renters\' Rights Act 2025',
        body: 'This Act received Royal Assent on 27 October 2025 — the most significant change to renting law in a generation.',
        isBanner: true,
      },
      {
        heading: 'Section 21 abolished from 1 May 2026',
        body: 'From 1 May 2026, landlords can no longer evict tenants without a legal reason. \'No-fault\' evictions are gone.',
      },
      {
        heading: 'Rolling tenancies',
        body: 'Fixed-term tenancies are replaced by rolling periodic tenancies. You can leave with 2 months\' written notice at any time — no more being locked in.',
      },
      {
        heading: 'How landlords can still evict',
        body: 'Landlords must use Section 8 and prove a legal ground — such as serious rent arrears, anti-social behaviour, or wanting to sell the property.',
      },
      {
        heading: 'Student HMO exemption (Ground 4A)',
        body: 'For student HMOs, landlords can reclaim the property between 1 June and 30 September to re-let to new students — but ONLY if they told you about this before you signed the tenancy agreement.',
      },
      {
        heading: 'Other key changes',
        body: '• Rent can only be increased once per year with 2 months\' written notice\n• Bidding wars are banned — landlords must advertise a set price\n• Landlords cannot demand more than 1 month\'s rent in advance',
      },
    ],
    contacts: [
      { label: 'Guild Advice Team', type: 'email', value: 'mailto:advice@exeterguild.com' },
      { label: 'Shelter: free housing advice', type: 'web', value: 'https://www.shelter.org.uk' },
    ],
  },
  {
    id: 'entry',
    title: 'Landlord Entry',
    icon: 'key-outline',
    summary: 'Your home is yours. Your landlord cannot enter without proper notice.',
    sections: [
      {
        heading: 'The 24-hour rule',
        body: 'Your landlord must give you at least 24 hours\' written notice before entering the property for any non-emergency reason. Entering without notice is a breach of your right to quiet enjoyment.',
      },
      {
        heading: 'What to do if they enter without notice',
        body: '1. Document the incident with dates and details.\n2. Write to your landlord formally stating that 24 hours\' written notice is legally required.\n3. If it continues, contact the Guild Advice team or Citizens Advice.',
        isSteps: true,
      },
      {
        heading: 'Genuine emergencies',
        body: 'The only exception is a genuine emergency — for example, a gas leak or serious flood. In this case a landlord may enter immediately to prevent danger.',
      },
    ],
    contacts: [
      { label: 'Guild Advice Team', type: 'email', value: 'mailto:advice@exeterguild.com' },
      { label: 'Citizens Advice', type: 'web', value: 'https://www.citizensadvice.org.uk' },
    ],
  },
  {
    id: 'fees',
    title: 'Fees & Charges',
    icon: 'card-outline',
    summary: 'Most letting agent fees are banned. Know what is and is not legal.',
    sections: [
      {
        heading: 'Tenant Fees Act 2019',
        body: "Since June 2019, most fees charged by letting agents to tenants are banned. If you've been charged an illegal fee, you can reclaim it.",
      },
      {
        heading: 'What is permitted',
        body: '• Rent\n• Deposit (max 5 weeks\' rent)\n• Holding deposit (max 1 week\'s rent — must be returned when you sign or put toward your deposit)\n• Changes to the tenancy that you request\n• Late payment interest\n• Replacing a lost key',
      },
      {
        heading: 'Everything else is banned',
        body: "Admin fees, referencing fees, credit check fees, check-in fees, inventory fees, cleaning fees (upfront) — all banned. If you're charged any of these, report it immediately.",
      },
      {
        heading: 'Holding deposits',
        body: "Always get written confirmation of what any holding deposit covers before you pay. A landlord can only keep your holding deposit if you provide false information or withdraw from the tenancy without good reason.",
      },
    ],
    contacts: [
      { label: 'Report to Exeter City Council Trading Standards', type: 'phone', value: 'tel:01392277888' },
      { label: 'Citizens Advice', type: 'web', value: 'https://www.citizensadvice.org.uk' },
    ],
  },
  {
    id: 'help',
    title: 'Where to Get Help',
    icon: 'people-outline',
    summary: 'Free support available to all Exeter students — you are never alone.',
    sections: [
      {
        heading: 'Your first stop: Guild Advice',
        body: "The Exeter Students' Guild Advice team offer free, confidential advice on all housing issues. They know local landlords and can support you through disputes.",
      },
      {
        heading: 'The Council',
        body: 'Exeter City Council\'s Private Sector Housing team can inspect your property, order repairs, and investigate unlicensed HMOs. They are on your side.',
      },
      {
        heading: 'National resources',
        body: 'Shelter offers free national housing advice online and by phone. Citizens Advice can help with letters, legal rights, and next steps.',
      },
    ],
    contacts: [
      { label: "Guild Advice Team: advice@exeterguild.com", type: 'email', value: 'mailto:advice@exeterguild.com' },
      { label: 'Exeter City Council Housing: 01392 277888', type: 'phone', value: 'tel:01392277888' },
      { label: 'Email Exeter City Council', type: 'email', value: 'mailto:environmental.health@exeter.gov.uk' },
      { label: 'Shelter: free housing advice', type: 'web', value: 'https://www.shelter.org.uk' },
      { label: 'Citizens Advice', type: 'web', value: 'https://www.citizensadvice.org.uk' },
      { label: 'First-tier Tribunal', type: 'web', value: 'https://www.gov.uk/housing-tribunal' },
    ],
  },
];

// ─── What Do I Do If... interactive flows ─────────────────────────────────────
export const WHAT_DO_I_DO = [
  {
    id: 'deposit-withheld',
    question: 'My landlord is trying to withhold my deposit',
    steps: [
      { step: 1, text: 'Check your deposit is registered in a government-approved protection scheme (DPS, myDeposits, or TDS). You can search online using your postcode and landlord name.' },
      { step: 2, text: 'Request an itemised breakdown of proposed deductions in writing. Your landlord is legally required to provide this.' },
      { step: 3, text: 'If you disagree with the deductions, open a free dispute via the protection scheme. They have an impartial adjudicator — you do not need a solicitor.' },
      { step: 4, text: 'If the deposit was never protected, contact Guild Advice immediately — you may be entitled to 1–3× the deposit amount as compensation.' },
    ],
    contact: { label: 'Guild Advice Team', type: 'email', value: 'mailto:advice@exeterguild.com' },
  },
  {
    id: 'repair-ignored',
    question: 'My landlord won\'t fix a repair',
    steps: [
      { step: 1, text: "Report the issue in writing (text or email) and keep a copy. State clearly what the problem is, when you noticed it, and what you'd like done." },
      { step: 2, text: 'If no response after 14 days, follow up in writing. Keep all communications.' },
      { step: 3, text: "Contact Exeter City Council Environmental Health team on 01392 277888. They can inspect the property and formally order repairs." },
      { step: 4, text: 'If the issue is serious (no heating, unsafe electrics, severe mould), the council can act faster. Contact Guild Advice for extra support.' },
    ],
    contact: { label: 'Exeter City Council: 01392 277888', type: 'phone', value: 'tel:01392277888' },
  },
  {
    id: 'entry-no-notice',
    question: 'I think my landlord entered without notice',
    steps: [
      { step: 1, text: 'Document the incident immediately — note the date, time, what happened, and whether anything was moved or taken.' },
      { step: 2, text: "Write to your landlord formally (email or letter) stating that the law requires at least 24 hours' written notice before entry." },
      { step: 3, text: "If it happens again, this may constitute harassment or breach of your right to quiet enjoyment. Contact the Guild Advice team or Citizens Advice." },
      { step: 4, text: 'In serious cases, this can be reported to the council and may support a claim for damages in the small claims court.' },
    ],
    contact: { label: 'Guild Advice Team', type: 'email', value: 'mailto:advice@exeterguild.com' },
  },
  {
    id: 'eviction-threat',
    question: 'My landlord is threatening to evict me',
    steps: [
      { step: 1, text: 'Do not panic. Your landlord cannot physically remove you from the property without a court order — this process takes months and you have rights throughout.' },
      { step: 2, text: "Check what written notice you've received. Note the date, type of notice, and what ground (reason) they have cited." },
      { step: 3, text: "From 1 May 2026, Section 21 'no-fault' eviction is illegal. If you've received a Section 21 notice, contact Guild Advice immediately — it may not be valid." },
      { step: 4, text: 'Contact Guild Advice straight away so they can review your notice and advise on your response. Do not move out until you know your legal position.' },
    ],
    contact: { label: 'Guild Advice Team: advice@exeterguild.com', type: 'email', value: 'mailto:advice@exeterguild.com' },
  },
  {
    id: 'hmo-unlicensed',
    question: 'I think my house needs an HMO licence but doesn\'t have one',
    steps: [
      { step: 1, text: "Check Exeter City Council's online HMO register or call 01392 277888 to confirm whether your property is registered." },
      { step: 2, text: 'If it is unlicensed and has 5 or more occupants, your landlord is breaking the law and you may be entitled to up to 12 months of rent back.' },
      { step: 3, text: "Apply for a Rent Repayment Order (RRO) through the First-tier (Property) Tribunal. This is a formal legal process but does not require a solicitor." },
      { step: 4, text: 'Guild Advice can help you prepare your application and gather evidence. Start there.' },
    ],
    contact: { label: 'First-tier Tribunal', type: 'web', value: 'https://www.gov.uk/housing-tribunal' },
  },
  {
    id: 'illegal-fees',
    question: 'My landlord is charging me fees I don\'t think are legal',
    steps: [
      { step: 1, text: "Check the list of permitted fees: rent, deposit (max 5 weeks), holding deposit (max 1 week), changes you've requested, late payment interest, lost key replacement." },
      { step: 2, text: "If the charge isn't on that list — admin fees, referencing fees, check-in fees, cleaning fees — it is almost certainly banned under the Tenant Fees Act 2019." },
      { step: 3, text: "Report it to Exeter City Council Trading Standards (01392 277888). They can investigate and fine the agent up to £5,000 for a first offence." },
      { step: 4, text: 'If you have already paid an illegal fee, you can reclaim it. Contact Citizens Advice or Guild Advice for help.' },
    ],
    contact: { label: 'Report fees: Exeter City Council', type: 'phone', value: 'tel:01392277888' },
  },
];
