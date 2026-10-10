// All page copy in one place. Facts are drawn from public reporting (see
// README "Sources"); anything not confirmed by the club should be verified
// before this goes live.

export const CLUB = {
  name: 'Vestavia Country Club',
  short: 'Vestavia',
  est: 1950,
  address: ['400 Beaumont Drive', 'Vestavia Hills, Alabama 35216'],
  phone: '(205) 822-8300',
  phoneHref: 'tel:+12058228300',
  maps: 'https://www.google.com/maps/search/?api=1&query=400+Beaumont+Drive+Vestavia+Hills+AL+35216',
};

export const NAV = [
  { label: 'Golf', href: '#course' },
  { label: 'Signature Holes', href: '#holes' },
  { label: 'Club Life', href: '#club-life' },
  { label: 'Membership', href: '#membership' },
  { label: 'Visit', href: '#visit' },
];

export const HERO = {
  eyebrow: 'Vestavia Hills, Alabama · Est. 1950',
  lines: [['Built', 'for'], ['the', 'view.']],
  sub: 'A private club on 176 acres of Appalachian foothills — home to a Lester George–renovated championship course that Golf Digest ranked No. 4 among America’s best new private courses.',
};

export const STATS = [
  { n: 'No. 4', l: 'Best New Private Courses', src: 'Golf Digest · Class of 2018' },
  { n: '176', l: 'Acres in the foothills', src: 'Vestavia Hills, AL' },
  { n: '6,811', l: 'Yards · Par 72', src: 'From the back tees' },
];

export const COURSE = {
  eyebrow: 'The Course',
  title: ['A George Cobb classic,', 'reopened to the horizon.'],
  body: [
    'When Lester George of George Golf Design began work in January 2017, the brief was a new irrigation system. It became a new golf course: tees, greens, fairways and bunkers renovated on all eighteen holes, ten of them rebuilt from scratch.',
    'More than 500 trees came down to reopen the long views across the ridges. The course reopened in June 2018 on new zoysia, with added water features and a new practice range — and was the only renovation on Golf Digest’s list of the year’s best new courses.',
  ],
  facts: [
    { k: '18', v: 'holes renovated' },
    { k: '10', v: 'rebuilt from scratch' },
    { k: '500+', v: 'trees cleared for the view' },
    { k: 'No. 7', v: 'in Alabama · Golf Digest Best in State, 2023–24' },
  ],
  timeline: [
    { y: '1948', e: 'Original clubhouse designed' },
    { y: '1950', e: 'Opens to members' },
    { y: '2017', e: 'Lester George renovation begins' },
    { y: '2018', e: 'Course reopens in June' },
    { y: '2019', e: 'No. 4 on Golf Digest’s Best New Private Courses of 2018' },
  ],
};

export const HOLES_INTRO = {
  eyebrow: 'Signature Holes',
  title: 'Four holes worth the walk.',
  lede: 'The renovation leaned on golf’s great template holes — ideas borrowed from St Andrews and North Berwick, fitted to Alabama rock and ridge.',
};

export const HOLES = [
  { n: '07', name: 'Over the Lake', kind: 'lake', tag: 'Par 3', text: 'The seventh now plays entirely across the water. Pick the club, commit, and let the lake decide.' },
  { n: '11', name: 'The Principal’s Nose', kind: 'nose', tag: 'St Andrews template', text: 'A cluster of bunkers sits squarely in the drive zone, after the Old Course’s 16th. Left or right — choose before you swing.' },
  { n: '13', name: 'Redan', kind: 'redan', tag: 'North Berwick template', text: 'A green angled away behind a deep front bunker. The smart play lands short and lets the slope do the rest.' },
  { n: '15', name: 'Biarritz', kind: 'biarritz', tag: 'Template green', text: 'A long green split by a deep swale. Front pin or back, the middle is the wrong answer.' },
];

export const LIFE_INTRO = {
  eyebrow: 'Club Life',
  title: 'The club, beyond the eighteenth.',
};

export const LIFE = [
  { key: 'tennis', title: 'Fifteen courts', tag: 'Tennis', text: 'Clay and hard courts beside a dedicated tennis clubhouse.' },
  { key: 'pools', title: 'Three pools', tag: 'Aquatics', text: 'Including a junior Olympic–size pool — the center of every Vestavia summer.' },
  { key: 'clubhouse', title: 'The clubhouse', tag: 'Dining & Events', text: 'Dining rooms and lounges, a refurbished ballroom, and a patio that looks out across the course.' },
  { key: 'family', title: 'Fitness & family', tag: 'Wellness', text: 'A fitness center and on-site childcare, so the whole family has a reason to come up the hill.' },
];

export const MEMBERSHIP = {
  eyebrow: 'Membership',
  title: ['Membership is', 'by invitation.'],
  body: 'Vestavia is a private club of roughly 900 members. If you would like to learn more, start with a member you know — or leave a note and the membership office will be in touch.',
  types: ['Golf', 'Tennis', 'Social', 'Junior'],
};
