/**
 * English translation bundle (default language, PRD §4.8). This is the source
 * of truth for all user-facing copy that has been externalized so far
 * (Sprint 3 member-facing surfaces + shared chrome). The Igbo bundle in
 * `./ig` overrides a subset and falls back here for everything else.
 */
export const en = {
  lang: {
    en: 'English',
    ig: 'Igbo',
  },
  chrome: {
    signOut: 'Sign out',
    languageAria: 'Language: {{name}}. Click to change.',
  },
  nav: {
    home: 'Home',
    profile: 'My profile',
    members: 'Members',
    households: 'Households',
    contributions: 'Contributions',
    expenses: 'Expenses',
    'sub-accounts': 'Sub-accounts',
    reports: 'Reports',
    admin: 'Admin',
  },
  dashboard: {
    welcome: 'Welcome',
    welcomeNamed: 'Welcome, {{name}}',
    householdLabel: 'Your household:',
    familyPortal: 'Your family portal',
    glance: 'This Year at a Glance',
    totalLabel: 'Total contributed (this year)',
    categoriesAria: 'Contribution categories',
    trackingSoon:
      "Contribution tracking begins soon — your family's totals will appear here once recording starts.",
    recent: 'Recent contributions',
    noContributions: 'No contributions recorded yet.',
    groupDues: 'Group dues',
    groupDuesEmpty: 'No group dues applied to you yet.',
    groupDuesAria: 'Group dues applied to you',
    downloadCta: 'Download my annual family summary',
    downloadTitle: 'Your annual family summary will be available later this year.',
    downloadNote:
      'Coming soon — for your personal tax preparation (not an official IRS receipt).',
  },
  categories: {
    cmoDues: 'CMO Dues',
    cwoDues: 'CWO Dues',
    harvest: 'Harvest',
    buildingFund: 'Building Fund',
    donations: 'Donations',
    offertory: 'Offertory',
  },
  profile: {
    title: 'My profile',
    notLinked:
      'Your account is not yet linked to a member record. Please contact the Financial Secretary.',
    loading: 'Loading…',
    memberNumber: 'Member number',
    household: 'Household',
    roleInHousehold: 'Role in household',
    baptismStatus: 'Baptism status',
    contactDetails: 'Contact details',
    editAria: 'Edit my contact details',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    save: 'Save changes',
    saving: 'Saving…',
    saved: 'Profile updated.',
    loadError: 'We could not load your profile. Please try again.',
    saveError: 'We could not save your changes. Please try again.',
    notConfigured: 'Saving is unavailable: the app is not configured.',
    myHousehold: 'My household',
    householdMembersAria: 'Household members',
    noHouseholdMembers: 'No household members on file yet.',
  },
  roles: {
    head: 'Head of household',
    spouse: 'Spouse',
    child: 'Child',
  },
  baptism: {
    baptized: 'Baptized',
    not_baptized: 'Not baptized',
    unknown: 'Unknown',
  },
  contributions: {
    title: 'Family contributions',
    subtitle: "Your family's dues and donations, for your own records.",
    year: 'Year',
    yearHeading: '{{year}} contributions',
    none: 'No contributions recorded yet.',
    noneNote:
      "Once your family's dues and donations are recorded, they'll appear here. You'll also be able to download an annual summary for your personal tax preparation.",
    totalHeading: 'Total contributed in {{year}}',
    byCategory: 'By category',
    viewAsChart: 'View as chart',
    viewAsTable: 'View as table',
    chartAria: 'Contributions by category for {{year}}',
    category: 'Category',
    amount: 'Amount',
    total: 'Total',
    loadError: 'We could not load your contributions. Please try again.',
  },
} as const;

export type TranslationResource = typeof en;
