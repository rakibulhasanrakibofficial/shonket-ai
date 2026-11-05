import {Component,useEffect,useRef,useState} from 'react';
import {analyzeMessage,createLocalPreview,searchDomainEvidence} from './services/messageCheckService';
import {buildUrlReviewContext,inspectUrl} from './services/urlInspectorService';
import AnalysisExportActions from './AnalysisExportActions';
import {motion,AnimatePresence} from 'framer-motion';
import {ShieldCheck,ScanSearch,BrainCircuit,ArrowUpRight,ArrowRight,Menu,X,Sparkles,Link2,MessageSquareText,LockKeyhole,Activity,Fingerprint,CheckCircle2,AlertTriangle,Globe2,ChevronRight,Users,History,Trash2,Clock3,Trophy,Mic,MicOff,Upload,ExternalLink,Info,FileText} from 'lucide-react';
const SOURCE_BRANDS = [
  {
    key: 'bkash',
    hosts: ['bkash.com'],
    ids: ['bkash-fraud-awareness', 'bkash-security-tips'],
    name: 'bKash',
    logos: [
      'https://seekvectors.com/storage/images/3532ad70c87c1c00da49a5e1cbb3560f.svg',
      'https://upload.wikimedia.org/wikipedia/commons/f/fe/Bkash.webp'
    ],
    surface: 'source-brand-surface-light'
  },
  {
    key: 'cirt',
    hosts: ['cirt.gov.bd'],
    ids: ['bgd-cirt-error524', 'cirt-alerts', 'cirt-smishing'],
    name: 'BGD e-GOV CIRT',
    logos: [
      'https://cirt.gov.bd/assets/images/CIRT-Main-Logo.png',
      'https://www.cirt.gov.bd/assets/images/CIRT-Main-Logo.png'
    ],
    surface: 'source-brand-surface-light'
  },
  {
    key: 'scamcheck',
    hosts: ['scamcheck.gov.bd'],
    ids: ['scamcheck-common-scams'],
    name: 'ScamCheck',
    logos: [
      'https://scamcheck.gov.bd/wp-content/uploads/2025/01/Copy-of-ScamCheck.png',
      'https://www.scamcheck.gov.bd/wp-content/uploads/2025/01/Copy-of-ScamCheck.png'
    ],
    surface: 'source-brand-surface-light'
  }
];

function getSourceBrand(source) {
  if (!source || typeof source !== 'object') return null;
  const id = String(source.id || '').toLowerCase();
  let host = String(source.domain || '').toLowerCase().trim();
  if (!host && source.url) {
    try { host = new URL(source.url).hostname.toLowerCase(); } catch { host = ''; }
  }
  host = host.replace(/^www\\./, '').split('/')[0].split(':')[0];
  return SOURCE_BRANDS.find(brand =>
    brand.ids.includes(id) ||
    brand.hosts.some(knownHost => host === knownHost || host.endsWith('.' + knownHost))
  ) || null;
}

function SourceBrand({ source, size = 'regular' }) {
  const [logoIndex, setLogoIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const brand = getSourceBrand(source);
  if (!brand) return null;
  const compact = size === 'compact';
  if (failed || !brand.logos[logoIndex]) {
    return <span className={'source-brand-fallback ' + (compact ? 'source-brand-fallback-compact' : '')} aria-label={brand.name}>{brand.name}</span>;
  }
  return (
    <span className={'source-brand-mark source-brand-' + brand.key + ' ' + (compact ? 'source-brand-mark-compact ' : '') + brand.surface} title={brand.name} aria-label={brand.name}>
      <img
        src={brand.logos[logoIndex]}
        alt={brand.name + ' logo'}
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => {
          if (logoIndex + 1 < brand.logos.length) setLogoIndex(index => index + 1);
          else setFailed(true);
        }}
        className="source-brand-image"
      />
    </span>
  );
}


function getLiveSourceHost(source) {
  const raw = String(source?.url || source?.listingUrl || source?.domain || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : 'https://' + raw);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return raw.toLowerCase().replace(/^https?:\/\//, '').split(/[/:?#]/)[0].replace(/^www\./, '');
  }
}

function getLiveSourceDomain(source) {
  return getLiveSourceHost(source);
}

function LiveSourceLogo({ source, compact = false }) {
  const [logoIndex, setLogoIndex] = useState(0);
  const host = getLiveSourceHost(source);
  const brand = getSourceBrand(source);
  if (!host) return null;
  if (brand) return <SourceBrand source={source} size={compact ? 'compact' : 'regular'}/>;

  const encodedHost = encodeURIComponent(host);
  const logoCandidates = [
    'https://icons.duckduckgo.com/ip3/' + encodedHost + '.ico',
    'https://www.google.com/s2/favicons?domain=' + encodedHost + '&sz=128',
    'https://' + host + '/favicon.ico'
  ];
  if (logoIndex >= logoCandidates.length) {
    return <span className={'live-source-domain-fallback ' + (compact ? 'is-compact' : '')}>{host}</span>;
  }
  return (
    <span className={'live-source-logo live-source-favicon ' + (compact ? 'live-source-logo-compact' : '')}>
      <img
        src={logoCandidates[logoIndex]}
        alt={host + ' website icon'}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setLogoIndex(index => index + 1)}
      />
    </span>
  );
}

const WORKSPACE_TOOL_STYLES = {
  checker: {
    background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 52%, #4c1d95 100%)',
    border: '1px solid #c4b5fd',
    shadow: '0 5px 0 #312e81, 0 8px 16px rgba(139,92,246,.17), inset 0 1px 0 rgba(255,255,255,.4)'
  },
  links: {
    background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 52%, #1e40af 100%)',
    border: '1px solid #93c5fd',
    shadow: '0 5px 0 #1e3a8a, 0 8px 16px rgba(59,130,246,.17), inset 0 1px 0 rgba(255,255,255,.4)'
  },
  simulator: {
    background: 'linear-gradient(135deg, #5eead4 0%, #0f988c 52%, #115e59 100%)',
    border: '1px solid #99f6e4',
    shadow: '0 5px 0 #134e4a, 0 8px 16px rgba(20,184,166,.15), inset 0 1px 0 rgba(255,255,255,.4)'
  },
  history: {
    background: 'linear-gradient(135deg, #fdba74 0%, #ea580c 52%, #9a3412 100%)',
    border: '1px solid #fed7aa',
    shadow: '0 5px 0 #7c2d12, 0 8px 16px rgba(249,115,22,.15), inset 0 1px 0 rgba(255,255,255,.4)'
  }
};

function getWorkspaceToolButtonStyle(id, isActive) {
  const style = WORKSPACE_TOOL_STYLES[id] || WORKSPACE_TOOL_STYLES.checker;
  return {
    background: style.background,
    border: isActive ? '2px solid #ffffff' : style.border,
    color: '#ffffff',
    minHeight: '58px',
    padding: '13px 18px',
    fontSize: '14px',
    fontWeight: 850,
    lineHeight: 1.2,
    borderRadius: '16px',
    boxShadow: isActive
      ? style.shadow + ', 0 0 0 3px rgba(255,255,255,.12)'
      : style.shadow
  };
}

const scenarios=[
{tag:'MOBILE FINANCIAL SERVICE',title:'A support agent asks for your OTP',detail:'Someone claims your account will be blocked unless you share a one-time code.',choices:['Share the code to keep my account active','Stop and contact the official service channel','Forward the message to friends'],correct:1,explain:'Never disclose an OTP. Contact the service through its verified app or official support channel.',realSteps:['Do not read out or forward the OTP, even to someone claiming to be support.','End the conversation and open the service’s official app yourself.','If you already shared a code, contact the provider immediately through its verified support channel.']},
{tag:'JOB OFFER',title:'A recruiter promises a job after an upfront fee',detail:'The message offers a guaranteed job but asks you to pay a processing charge first.',choices:['Pay quickly before the offer expires','Verify the company independently','Send personal documents immediately'],correct:1,explain:'Upfront fees and artificial urgency are warning signs. Verify the employer independently.',realSteps:['Do not pay a recruiter to secure an interview or job.','Find the company’s official careers page and contact details independently.','Check whether the vacancy appears on the company’s verified channels.']},
{tag:'PRIZE NOTIFICATION',title:'You won a prize you never entered for',detail:'The sender asks for a small transfer to release a valuable reward.',choices:['Pay the release fee','Verify the promotion independently','Send account details'],correct:1,explain:'Unexpected prizes requiring payment or sensitive information are a common manipulation pattern.',realSteps:['Do not pay a release, tax or processing fee to claim an unexpected prize.','Check the promotion on the organisation’s official website or verified page.','Do not share OTPs, PINs, account details or identity documents with the sender.']},
{tag:'DELIVERY NOTICE',title:'A parcel is held until you pay a small fee',detail:'An unexpected message says a parcel cannot be delivered until you pay through an unfamiliar link.',choices:['Open the link and pay immediately','Check tracking through the courier’s official app or site','Send card details by reply'],correct:1,explain:'Check deliveries using a tracking number and an official channel you find independently.',realSteps:['Do not use the payment link in an unexpected delivery message.','Open the courier’s official app or type its known website address yourself.','Check the tracking number and contact the courier using independently found details.']},
{tag:'ACCOUNT SECURITY',title:'A caller says they can secure your account',detail:'The caller asks you to install an unknown app and share a one-time code.',choices:['Install it and share the code','End the call and contact official support independently','Give them remote access'],correct:1,explain:'Do not share codes or grant remote access to an unsolicited caller. Use the official support channel.',realSteps:['Do not install remote-access apps at an unsolicited caller’s request.','End the call and contact the provider using its official app or published support number.','If you installed an app or shared a code, seek help from the provider and secure the affected account.']},{"tag":"ONLINE MARKETPLACE","title":"A seller asks for an advance payment outside the platform","detail":"You find a phone or gadget in a social-media marketplace. The seller says many buyers are waiting and asks you to send a deposit to a personal wallet before you can see the item.","choices":["Send the deposit so the seller holds it","Ask to inspect it and use a safer platform or cash-on-delivery option","Share your wallet PIN to prove your identity"],"correct":1,"explain":"Pressure to pay outside a platform removes buyer protections. Verify the seller, inspect the item where possible, and use a payment method with clear buyer protection.","realSteps":["Do not pay a stranger in a hurry or move to an unprotected payment channel.","Check seller history, independent reviews and whether the item actually exists.","Prefer platform-protected payment or inspect-before-pay / cash-on-delivery where available."]},{"tag":"SCHOLARSHIP OR ADMISSION","title":"An agent guarantees a scholarship if you pay today","detail":"A social-media page claims it has a special university quota. It promises a guaranteed scholarship or admission if you pay a processing fee and send your certificates immediately.","choices":["Pay because the deadline is today","Check the university’s official scholarship and admissions pages, then contact its office","Send scans of every identity document to the page"],"correct":1,"explain":"No agent can guarantee a decision made by a university. Urgency, unofficial payment accounts and requests for excessive documents are warning signs.","realSteps":["Find the university website yourself; do not rely on links sent by the agent.","Contact the admissions or scholarship office using contact details published there.","Do not send original documents, passwords, OTPs or fees to an unverified person."]},{"tag":"QR CODE / PAYMENT REQUEST","title":"A buyer sends a QR code to “receive” your payment","detail":"You are selling something. The buyer says they have paid, but sends a QR code or a wallet collect request and tells you to scan or approve it to receive the money.","choices":["Scan the code and approve the request","Check your own wallet balance and transaction history; never approve an unexpected collect request","Share your OTP so the buyer can complete the payment"],"correct":1,"explain":"Receiving money should not require you to reveal an OTP or approve an unexpected request to send money. A screenshot or payment notification from the buyer is not proof of payment.","realSteps":["Open your own official wallet or bank app independently.","Confirm the money is actually credited in your balance or transaction history before handing over the item.","Never share PINs or OTPs, and do not approve a collect request you did not initiate."]},{"tag":"FRIEND OR FAMILY IMPERSONATION","title":"A familiar account urgently asks you to send money","detail":"A friend’s messaging account says their phone is lost and they need money immediately. The message asks you not to call because they are in a hurry.","choices":["Send the money to avoid delaying them","Verify through a different trusted route, such as their known phone number or a family member","Forward the request to a group and ask someone to pay"],"correct":1,"explain":"A familiar profile can be compromised or impersonated. Urgency and discouraging verification are manipulation signals.","realSteps":["Pause and do not transfer money based only on a chat message.","Call the person using a number you already know, not a number supplied in the message.","If you cannot verify, contact a trusted family member and report the suspicious account."]}
];
const scenarioBn=[
{tag:'মোবাইল আর্থিক সেবা',title:'একজন সাপোর্ট এজেন্ট আপনার OTP চাইছে',detail:'কেউ দাবি করছে একবার ব্যবহারযোগ্য কোড না দিলে আপনার অ্যাকাউন্ট বন্ধ হয়ে যাবে।',choices:['অ্যাকাউন্ট সচল রাখতে কোডটি শেয়ার করব','থামব এবং অফিসিয়াল সাপোর্টে যোগাযোগ করব','বার্তাটি বন্ধুদের পাঠাব'],explain:'কখনো OTP দেবেন না। নিজে থেকে খুঁজে নেওয়া অফিসিয়াল অ্যাপ বা সাপোর্ট চ্যানেলে যোগাযোগ করুন।',realSteps:['সাপোর্ট পরিচয় দিলেও OTP কাউকে বলবেন না বা ফরোয়ার্ড করবেন না।','কথা বন্ধ করে নিজে অফিসিয়াল অ্যাপ খুলুন।','ইতিমধ্যে কোড দিয়ে ফেললে দ্রুত যাচাইকৃত সাপোর্টে যোগাযোগ করুন।']},
{tag:'চাকরির প্রস্তাব',title:'একজন নিয়োগদাতা আগাম ফি দিয়ে চাকরির প্রতিশ্রুতি দিচ্ছে',detail:'নিশ্চিত চাকরির কথা বলে আগে প্রসেসিং চার্জ দিতে বলছে।',choices:['সময় শেষ হওয়ার আগে দ্রুত টাকা দেব','প্রতিষ্ঠানটি নিজে যাচাই করব','সঙ্গে সঙ্গে ব্যক্তিগত নথি পাঠাব'],explain:'আগাম ফি ও কৃত্রিম তাড়াহুড়ো সতর্কতার লক্ষণ। নিয়োগদাতাকে স্বাধীনভাবে যাচাই করুন।',realSteps:['ইন্টারভিউ বা চাকরি নিশ্চিত করতে নিয়োগদাতাকে টাকা দেবেন না।','প্রতিষ্ঠানের অফিসিয়াল ক্যারিয়ার পেজ ও যোগাযোগের তথ্য নিজে খুঁজুন।','প্রতিষ্ঠানের যাচাইকৃত চ্যানেলে নিয়োগ বিজ্ঞপ্তি আছে কি না দেখুন।']},
{tag:'পুরস্কারের নোটিশ',title:'এমন পুরস্কার জেতার দাবি যা আপনি কখনোতে অংশ নেননি',detail:'মূল্যবান পুরস্কার ছাড় করতে ছোট অঙ্কের টাকা পাঠাতে বলছে।',choices:['পুরস্কার ছাড়ের ফি দেব','প্রচারটি স্বাধীনভাবে যাচাই করব','অ্যাকাউন্টের তথ্য পাঠাব'],explain:'অপ্রত্যাশিত পুরস্কারের জন্য টাকা বা সংবেদনশীল তথ্য চাওয়া সাধারণ প্রতারণার কৌশল।',realSteps:['অপ্রত্যাশিত পুরস্কার পেতে ছাড়, কর বা প্রসেসিং ফি দেবেন না।','প্রতিষ্ঠানের অফিসিয়াল ওয়েবসাইট বা যাচাইকৃত পেজে প্রচারটি দেখুন।','প্রেরককে OTP, PIN, অ্যাকাউন্টের তথ্য বা পরিচয়পত্র দেবেন না।']},
{tag:'ডেলিভারি নোটিশ',title:'ছোট ফি না দিলে পার্সেল আটকে থাকবে',detail:'অপরিচিত লিংকে টাকা না দিলে পার্সেল দেওয়া হবে না—এমন বার্তা এসেছে।',choices:['লিংক খুলে দ্রুত টাকা দেব','কুরিয়ারের অফিসিয়াল অ্যাপ বা সাইটে ট্র্যাকিং দেখব','কার্ডের তথ্য রিপ্লাই দেব'],explain:'নিজে থেকে পাওয়া অফিসিয়াল অ্যাপ বা ওয়েবসাইটে ট্র্যাকিং নম্বর দিয়ে যাচাই করুন।',realSteps:['অচেনা ডেলিভারি মেসেজের পেমেন্ট লিংক ব্যবহার করবেন না।','কুরিয়ারের অফিসিয়াল অ্যাপ খুলুন বা পরিচিত ওয়েব ঠিকানা নিজে লিখুন।','ট্র্যাকিং নম্বর ও নিজে খুঁজে পাওয়া কুরিয়ার যোগাযোগের তথ্য দিয়ে যাচাই করুন।']},
{tag:'অ্যাকাউন্ট নিরাপত্তা',title:'একজন কলার বলছে সে আপনার অ্যাকাউন্ট নিরাপদ করবে',detail:'কলার অজানা অ্যাপ ইনস্টল করতে এবং একবার ব্যবহারযোগ্য কোড দিতে বলছে।',choices:['অ্যাপ ইনস্টল করে কোড দেব','কল কেটে নিজে অফিসিয়াল সাপোর্টে যোগাযোগ করব','তাকে দূর থেকে অ্যাক্সেস দেব'],explain:'অযাচিত কলারের সঙ্গে কোড শেয়ার বা দূরবর্তী অ্যাক্সেস দেবেন না। নিজে অফিসিয়াল সাপোর্ট চ্যানেল ব্যবহার করুন।',realSteps:['অযাচিত কলারের কথায় রিমোট-অ্যাক্সেস অ্যাপ ইনস্টল করবেন না।','কল কেটে নিজে অফিসিয়াল অ্যাপ বা প্রকাশিত সাপোর্ট নম্বরে যোগাযোগ করুন।','অ্যাপ ইনস্টল বা কোড শেয়ার করে ফেললে দ্রুত সেবা প্রদানকারীর সাহায্য নিন।']},{"tag":"অনলাইন মার্কেটপ্লেস","title":"বিক্রেতা প্ল্যাটফর্মের বাইরে অগ্রিম টাকা চাইছে","detail":"সোশ্যাল মিডিয়ায় ফোন বা গ্যাজেট দেখে যোগাযোগ করলেন। বিক্রেতা বলছে অনেক ক্রেতা অপেক্ষায় আছে, তাই পণ্য দেখার আগেই ব্যক্তিগত ওয়ালেটে অগ্রিম পাঠাতে হবে।","choices":["পণ্যটি ধরে রাখতে অগ্রিম পাঠাব","সম্ভব হলে পণ্য দেখে এবং নিরাপদ প্ল্যাটফর্ম বা ক্যাশ-অন-ডেলিভারিতে লেনদেন করব","পরিচয় প্রমাণ করতে ওয়ালেট PIN দেব"],"explain":"প্ল্যাটফর্মের বাইরে তাড়াহুড়ো করে টাকা দিলে ক্রেতার সুরক্ষা কমে যায়। বিক্রেতা যাচাই করুন, সম্ভব হলে পণ্য দেখে নিন এবং সুরক্ষিত পেমেন্ট পদ্ধতি ব্যবহার করুন।","realSteps":["অপরিচিত কাউকে তাড়াহুড়ো করে অগ্রিম দেবেন না।","বিক্রেতার পুরোনো কার্যক্রম, স্বাধীন রিভিউ এবং পণ্যের সত্যতা যাচাই করুন।","সম্ভব হলে প্ল্যাটফর্মের সুরক্ষিত পেমেন্ট বা পণ্য দেখে ক্যাশ-অন-ডেলিভারি বেছে নিন।"]},{"tag":"স্কলারশিপ বা ভর্তি","title":"একজন এজেন্ট আজ টাকা দিলে স্কলারশিপ নিশ্চিত বলছে","detail":"সোশ্যাল মিডিয়ার একটি পেজ বিশেষ বিশ্ববিদ্যালয় কোটা থাকার দাবি করছে। প্রসেসিং ফি ও সার্টিফিকেট পাঠালে নিশ্চিত স্কলারশিপ বা ভর্তি করিয়ে দেওয়ার প্রতিশ্রুতি দিচ্ছে।","choices":["আজই শেষ সময় বলে টাকা দেব","বিশ্ববিদ্যালয়ের অফিসিয়াল স্কলারশিপ ও ভর্তি তথ্য দেখে অফিসে যোগাযোগ করব","পেজটিতে সব পরিচয়পত্রের স্ক্যান পাঠাব"],"explain":"বিশ্ববিদ্যালয়ের সিদ্ধান্ত কোনো এজেন্ট নিশ্চিত করে দিতে পারে না। জরুরি চাপ, ব্যক্তিগত অ্যাকাউন্টে টাকা এবং অপ্রয়োজনীয় নথি চাওয়া সতর্কতার লক্ষণ।","realSteps":["এজেন্টের লিংক নয়, নিজে বিশ্ববিদ্যালয়ের অফিসিয়াল ওয়েবসাইট খুঁজুন।","সেখানে দেওয়া যোগাযোগের তথ্য দিয়ে ভর্তি বা স্কলারশিপ অফিসে কথা বলুন।","যাচাই ছাড়া আসল নথি, পাসওয়ার্ড, OTP বা ফি দেবেন না।"]},{"tag":"QR কোড / পেমেন্ট রিকোয়েস্ট","title":"একজন ক্রেতা টাকা পাওয়ার জন্য QR কোড পাঠিয়েছে","detail":"আপনি কিছু বিক্রি করছেন। ক্রেতা বলছে সে টাকা পাঠিয়েছে, কিন্তু টাকা পেতে আপনাকে QR কোড স্ক্যান বা ওয়ালেটের collect request অনুমোদন করতে হবে।","choices":["QR কোড স্ক্যান করে অনুরোধ অনুমোদন করব","নিজের ওয়ালেটের ব্যালেন্স ও লেনদেন দেখব; অচেনা collect request অনুমোদন করব না","ক্রেতাকে OTP দিয়ে পেমেন্ট সম্পন্ন করব"],"explain":"টাকা গ্রহণ করতে OTP দেওয়া বা অপ্রত্যাশিত টাকা পাঠানোর অনুরোধ অনুমোদন করা লাগে না। ক্রেতার স্ক্রিনশট পেমেন্টের প্রমাণ নয়।","realSteps":["নিজে অফিসিয়াল ওয়ালেট বা ব্যাংক অ্যাপ খুলুন।","ব্যালেন্স বা transaction history-তে টাকা জমা হয়েছে কি না নিশ্চিত না হয়ে পণ্য দেবেন না।","PIN/OTP দেবেন না এবং নিজে শুরু করেননি এমন collect request অনুমোদন করবেন না।"]},{"tag":"বন্ধু বা পরিবারের পরিচয় নকল","title":"পরিচিত অ্যাকাউন্ট থেকে জরুরি টাকা চাওয়া হয়েছে","detail":"বন্ধুর মেসেজিং অ্যাকাউন্ট থেকে বলা হচ্ছে ফোন হারিয়েছে, এখনই টাকা দরকার। ব্যস্ততার অজুহাতে কল না করতে বলা হচ্ছে।","choices":["দেরি না করে টাকা পাঠাব","আগে থেকে জানা ফোন নম্বর বা পরিবারের সদস্যের মাধ্যমে আলাদাভাবে যাচাই করব","মেসেজটি গ্রুপে পাঠিয়ে কাউকে টাকা দিতে বলব"],"explain":"পরিচিত প্রোফাইলও হ্যাক বা নকল হতে পারে। জরুরি চাপ এবং যাচাই করতে নিষেধ করা প্রতারণার সংকেত।","realSteps":["শুধু চ্যাটের ভিত্তিতে টাকা পাঠাবেন না।","মেসেজে দেওয়া নম্বর নয়, আগে থেকে জানা নম্বরে কল করুন।","যাচাই না হলে পরিবারের বিশ্বস্ত সদস্যকে জানান এবং সন্দেহজনক অ্যাকাউন্ট রিপোর্ট করুন।"]}
];
function Brand() {
  return (
    <a href="#home" aria-label="SHONKET AI home" className="brand-lockup group flex items-center gap-3 text-white no-underline">
      <span className="brand-mark relative grid h-12 w-12 shrink-0 place-items-center rounded-[16px]" aria-hidden="true">
        <span className="brand-mark-inner absolute inset-[3px] rounded-[13px]" />
        <svg viewBox="0 0 48 48" className="relative z-10 h-8 w-8 overflow-visible" fill="none" aria-hidden="true">
          <path d="M24 3.5 40 9v12.2c0 10.2-6.4 17.8-16 23.1C14.4 39 8 31.4 8 21.2V9L24 3.5Z" stroke="url(#brandStroke)" strokeWidth="2.8" strokeLinejoin="round" />
          <path d="m15.5 23.8 5.7 5.7 11.6-12.2" stroke="white" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="brandStroke" x1="8" y1="4" x2="40" y2="44">
              <stop stopColor="#7DEBFF" />
              <stop offset=".52" stopColor="#A78BFA" />
              <stop offset="1" stopColor="#F0A6FF" />
            </linearGradient>
          </defs>
        </svg>
        <span className="brand-mark-spark absolute right-[7px] top-[6px] z-20 h-1.5 w-1.5 rounded-full bg-cyan-200" />
      </span>
      <span className="brand-copy flex min-w-0 flex-col gap-1">
        <span className="brand-wordmark flex items-baseline gap-1">
          <span className="font-display text-[20px] font-extrabold tracking-[-.055em]">Shonket</span>
          <span className="brand-ai text-[10px] font-extrabold tracking-[.14em]">AI</span>
        </span>
        <span className="brand-tagline hidden xl:block">AI Scam &amp; Fraud Detection for Bangladesh</span>
      </span>
    </a>
  );
}
function AppContent(){
const[active,setActive]=useState('checker'),[mobile,setMobile]=useState(false),[message,setMessage]=useState(''),[analysis,setAnalysis]=useState(null),[busy,setBusy]=useState(false),[analysisError,setAiError]=useState(''),[language,setLanguage]=useState('en'),[analysisLanguage,setAnalysisLanguage]=useState('en'),[url,setUrl]=useState(''),[urlResult,setUrlResult]=useState(null),[linkAnalysis,setLinkAnalysis]=useState(null),[linkBusy,setLinkBusy]=useState(false),[scenario,setScenario]=useState(0),[choice,setChoice]=useState(null),[simScore,setSimScore]=useState(0),[simDone,setSimDone]=useState([]),[simFinished,setSimFinished]=useState(false),[speaking,setSpeaking]=useState(false),[speechPaused,setSpeechPaused]=useState(false),[voiceOptions,setVoiceOptions]=useState([]),[selectedVoice,setSelectedVoice]=useState(''),[voiceInputLanguage,setVoiceInputLanguage]=useState('en'),[voiceListening,setVoiceListening]=useState(false),[voiceError,setVoiceError]=useState(''),[imageFile,setImageFile]=useState(null),[imagePreview,setImagePreview]=useState(''),[historyRecords,setHistoryRecords]=useState(()=>{try{return JSON.parse(localStorage.getItem('shonket-history-v1')||'[]')}catch{return []}});
const recognitionRef=useRef(null);
const analysisRequestRef=useRef(0);
const voiceSessionRef=useRef(0);
const voiceStopRequestedRef=useRef(false);
const officialSearchRef=useRef(null);
const linkOfficialSearchRef=useRef(null);
const linkInspectionRequestRef=useRef(0);
const analysisScrollRequestRef=useRef(0);
const lastAutoScrolledRequestRef=useRef(0);
const resultLanguage=analysis?.responseLanguage || (analysisLanguage==='bn'?'bn':'en');
 const officialPortalCount=Number(analysis?.claimVerification?.officialPortalCount)||analysis?.officialSearch?.searchedPortals?.length||analysis?.webEvidence?.searchedPortals?.length||0;
const preferredVoiceLanguage=resultLanguage==='bn'?'bn':'en';
const matchingVoiceOptions=voiceOptions.filter(voice=>String(voice.lang||'').toLowerCase().startsWith(preferredVoiceLanguage));
const selectableVoiceOptions=matchingVoiceOptions.length?matchingVoiceOptions:voiceOptions;
const isBn=language==='bn';
const autoVoiceLanguage=language;
const t=(en,bn)=>isBn?bn:en;
const addHistory=entry=>setHistoryRecords(prev=>[{id:Date.now()+Math.random(),createdAt:new Date().toISOString(),...entry},...prev].slice(0,50));
useEffect(()=>{try{localStorage.setItem('shonket-history-v1',JSON.stringify(historyRecords))}catch{}},[historyRecords]);
useEffect(()=>{if(!imagePreview)return;return()=>URL.revokeObjectURL(imagePreview)},[imagePreview]);
useEffect(()=>{
  if(!analysis)return;
  const requestId=analysisScrollRequestRef.current;
  if(!requestId||lastAutoScrolledRequestRef.current===requestId)return;
  let frameOne=0;
  let frameTwo=0;
  frameOne=window.requestAnimationFrame(()=>{
    frameTwo=window.requestAnimationFrame(()=>{
      const target=document.getElementById('analysis-results');
      if(!target)return;
      const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const coarsePointer=window.matchMedia('(pointer: coarse)').matches;
      // Keep the verdict and risk score in view first; evidence follows below.
      const behavior=reduceMotion||coarsePointer?'auto':'smooth';
      target.scrollIntoView({behavior,block:'start'});
      lastAutoScrolledRequestRef.current=requestId;
    });
  });
  return ()=>{
    window.cancelAnimationFrame(frameOne);
    window.cancelAnimationFrame(frameTwo);
  };
},[analysis,busy]);
useEffect(()=>{document.documentElement.lang=resultLanguage;},[resultLanguage]);
useEffect(()=>{if(!('speechSynthesis'in window))return;const load=()=>setVoiceOptions(window.speechSynthesis.getVoices());load();window.speechSynthesis.onvoiceschanged=load;return()=>{window.speechSynthesis.onvoiceschanged=null}},[]);
const nav=[['checker',t('Scam Checker','স্ক্যাম চেকার')],['links',t('Link Inspector','লিংক পরিদর্শক')],['simulator',t('Simulator','সিমুলেটর')],['history',t('History','ইতিহাস')]];
useEffect(()=>()=>{
  voiceSessionRef.current+=1;
  const recognition=recognitionRef.current;
  recognitionRef.current=null;
  try{recognition?.abort()}catch(error){console.warn('SHONKET voice cleanup:',error)}
  try{window.speechSynthesis?.cancel()}catch(error){console.warn('SHONKET speech cleanup:',error)}
},[]);
const go=id=>{setActive(id);setMobile(false);document.getElementById('tools')?.scrollIntoView({behavior:'smooth'});window.setTimeout(()=>document.getElementById('workspace-panel')?.scrollIntoView({behavior:'smooth',block:'center'}),220)};
async function analyze(){
  const cleanMessage=message.trim();
  if((!cleanMessage&&!imageFile)||busy)return;
  const requestId=++analysisRequestRef.current;
  const preview=!imageFile?createLocalPreview({message:cleanMessage,language:analysisLanguage}):null;
  officialSearchRef.current=null;
  analysisScrollRequestRef.current+=1;
  setBusy(true);
  setAnalysis(preview);
  setAiError('');
  const onOfficialSearch=payload=>{
    if(analysisRequestRef.current!==requestId)return;
    officialSearchRef.current=payload;
    setAnalysis(current=>{
      if(!current)return current;
      const next={...current,...payload};
      // A generic official-search response can be not_applicable even when
      // the primary analysis has already identified a claim needing verification.
      // Do not let that secondary response erase the primary claim assessment.
      if(payload.claimVerification?.status==='not_applicable'&&current.claimVerification?.status&&current.claimVerification.status!=='not_applicable'){
        next.claimVerification=current.claimVerification;
      }
      return next;
    });
  };
  try{
    const result=await analyzeMessage({
      message,
      imageFile,
      language:analysisLanguage,
      onOfficialSearch,
      onLocalPreview:pendingPreview=>{
        if(analysisRequestRef.current!==requestId)return;
        setAnalysis(current=>{
           const next={...pendingPreview,...(officialSearchRef.current||{})};
           if(officialSearchRef.current?.claimVerification?.status==='not_applicable'&&pendingPreview.claimVerification?.status&&pendingPreview.claimVerification.status!=='not_applicable'){
             next.claimVerification=pendingPreview.claimVerification;
           }
           return next;
         });
      }
    });
    if(analysisRequestRef.current!==requestId)return;
    setAnalysis(()=>{
       const next={...result,...(officialSearchRef.current||{})};
       if(officialSearchRef.current?.claimVerification?.status==='not_applicable'&&result.claimVerification?.status&&result.claimVerification.status!=='not_applicable'){
         next.claimVerification=result.claimVerification;
       }
       return next;
     });
    if(result.extractedText){setMessage(result.combinedText||result.extractedText);removeImage()}
    addHistory({type:'Scam Checker',title:result.screenshotRead?'Screenshot analysis':'Message analysis',verdict:result.verdict||'unknown',riskLevel:result.riskLevel||'unknown',riskScore:result.riskScore==null?null:(Number.isFinite(Number(result.riskScore))?Number(result.riskScore):null)});
  }catch(error){
    if(analysisRequestRef.current!==requestId)return;
    if(preview)setAnalysis({...createLocalPreview({message:cleanMessage,language:analysisLanguage,status:'unavailable'}),...(officialSearchRef.current||{})});
    setAiError(String(error?.message||'Could not check this message. Please try again.'));
  }finally{
    if(analysisRequestRef.current===requestId)setBusy(false);
  }
}
function handleImage(file){
  if(!file)return;
  const input=document.getElementById('screenshot-upload');
  const resetInput=()=>{if(input)input.value=''};
  const rejectImage=message=>{
    setImageFile(null);
    setImagePreview('');
    resetInput();
    setAiError(message);
  };
  const supportedTypes=['image/png','image/jpeg','image/webp'];
  if(!supportedTypes.includes(file.type)){
    rejectImage(t('Unsupported image type. Upload a PNG, JPG, or WebP screenshot.','এই ছবির ধরন সমর্থিত নয়। PNG, JPG অথবা WebP স্ক্রিনশট দিন।'));
    return;
  }
  if(!Number.isFinite(file.size)||file.size<=0){
    rejectImage(t('This screenshot is empty. Choose a valid image file.','স্ক্রিনশটটি খালি। একটি সঠিক ছবির ফাইল বেছে নিন।'));
    return;
  }
  if(file.size>2.5*1024*1024){
    rejectImage(t('Screenshot must be 2.5 MB or smaller.','স্ক্রিনশটের আকার ২.৫ MB বা কম হতে হবে।'));
    return;
  }
  try{
    const previewUrl=URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(previewUrl);
    setAnalysis(null);
    setAiError('');
    resetInput();
  }catch(error){
    rejectImage(t('The screenshot preview could not be opened. Try another image or paste the text.','স্ক্রিনশটের preview খোলা যায়নি। অন্য ছবি দিন অথবা লেখা পেস্ট করুন।'));
  }
}
function removeImage(){setImageFile(null);setImagePreview('');const input=document.getElementById('screenshot-upload');if(input)input.value='';setAiError('')}
function speakAnalysis(){if(!analysis)return;if(!('speechSynthesis'in window)){setAiError(t('Text-to-speech is not supported in this browser.','এই ব্রাউজারে লেখা পড়ে শোনানোর সুবিধা নেই।'));return}window.speechSynthesis.cancel();const textToRead=[resultLanguage==='bn'?analysis.summary_bn:analysis.summary_en,...(analysis.evidence||[]).map(e=>resultLanguage==='bn'?e.reason_bn:e.reason_en),...(analysis.safe_actions||[]),analysis.uncertainty].filter(Boolean).join('. ');const utterance=new SpeechSynthesisUtterance(textToRead);utterance.lang=resultLanguage==='bn'?'bn-BD':'en-US';const chosen=voiceOptions.find(v=>v.name===selectedVoice);if(chosen)utterance.voice=chosen;utterance.onstart=()=>{setSpeaking(true);setSpeechPaused(false)};utterance.onend=()=>{setSpeaking(false);setSpeechPaused(false)};utterance.onerror=()=>{setSpeaking(false);setSpeechPaused(false)};window.speechSynthesis.speak(utterance)}
function pauseResumeSpeech(){if(!('speechSynthesis'in window))return;if(window.speechSynthesis.paused){window.speechSynthesis.resume();setSpeechPaused(false)}else{window.speechSynthesis.pause();setSpeechPaused(true)}}
function stopSpeaking(){window.speechSynthesis?.cancel();setSpeaking(false);setSpeechPaused(false)}
function beginVoiceRecognition(){
  setVoiceError('');
  if(recognitionRef.current)return;

  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition){
    setVoiceError(t('Voice input is not supported in this browser. Try Chrome or use your device keyboard dictation.','এই ব্রাউজারে ভয়েস ইনপুট সমর্থিত নয়। Chrome অথবা ডিভাইসের কিবোর্ড ডিকটেশন ব্যবহার করুন।'));
    return;
  }

  let recognition;
  try{
    recognition=new Recognition();
  }catch(error){
    console.error('SHONKET voice setup error:',error);
    setVoiceListening(false);
    setVoiceError(t('Could not initialise voice input. Please refresh the page or type the message.','ভয়েস ইনপুট চালু করা যায়নি। পেজ রিফ্রেশ করুন অথবা লিখে দিন।'));
    return;
  }

  const sessionId=voiceSessionRef.current+1;
  voiceSessionRef.current=sessionId;
  const isCurrentSession=()=>voiceSessionRef.current===sessionId&&recognitionRef.current===recognition;

  recognition.lang=voiceInputLanguage==='bn'?'bn-BD':'en-US';
  recognition.continuous=false;
  recognition.interimResults=false;
  recognition.maxAlternatives=1;
  voiceStopRequestedRef.current=false;
  recognitionRef.current=recognition;

  recognition.onstart=()=>{
    if(!isCurrentSession())return;
    setVoiceError('');
    setVoiceListening(true);
  };
  recognition.onnomatch=()=>{
    if(!isCurrentSession())return;
    setVoiceListening(false);
    setVoiceError(t('No clear speech was recognised. Please try again or type the message.','স্পষ্ট কোনো কথা শনাক্ত হয়নি। আবার চেষ্টা করুন অথবা লিখে দিন।'));
  };
  recognition.onresult=event=>{
    if(!isCurrentSession())return;
    try{
      const results=event?.results;
      const resultIndex=Number.isInteger(event?.resultIndex)?event.resultIndex:0;
      const result=results?.[resultIndex]||results?.[0];
      const transcript=String(result?.[0]?.transcript||'').trim();
      if(!transcript)return;
      setMessage(current=>[current.trim(),transcript].filter(Boolean).join('\n').slice(0,4000));
      setAnalysis(null);
      setAiError('');
      setVoiceError('');
    }catch(error){
      console.error('SHONKET voice transcript error:',error);
      setVoiceError(t('Speech was received but could not be added to the message. Please type it instead.','কথা শনাক্ত হলেও বার্তায় যোগ করা যায়নি। অনুগ্রহ করে লিখে দিন।'));
    }
  };
  recognition.onerror=event=>{
    if(!isCurrentSession())return;
    const error=event?.error||'';
    const messages={
      'not-allowed':t('Microphone permission was denied. Allow microphone access in browser settings.','মাইক্রোফোনের অনুমতি দেওয়া হয়নি। ব্রাউজার সেটিংসে অনুমতি দিন।'),
      'service-not-allowed':t('The browser blocked its speech service. Check browser permissions or type the message.','ব্রাউজার speech service ব্লক করেছে। browser permission পরীক্ষা করুন অথবা লিখে দিন।'),
      'audio-capture':t('No microphone was found. Check your device microphone.','মাইক্রোফোন পাওয়া যায়নি। ডিভাইসের মাইক্রোফোন পরীক্ষা করুন।'),
      'no-speech':t('No speech was detected. Press Speak and try again.','কোনো কথা শনাক্ত হয়নি। Speak চেপে আবার চেষ্টা করুন।'),
      'language-not-supported':t('This voice language is not supported by your browser.','আপনার ব্রাউজারে এই ভাষার voice input সমর্থিত নয়।'),
      'network':t('The browser speech service could not connect. Check your connection or type the message instead.','ব্রাউজারের speech service-এ সংযোগ হয়নি। ইন্টারনেট পরীক্ষা করুন অথবা লিখে দিন।')
    };
    setVoiceListening(false);
    if(error==='aborted'&&voiceStopRequestedRef.current)return;
    setVoiceError(messages[error]||t('Voice input stopped. Please try again or type the message.','ভয়েস ইনপুট বন্ধ হয়েছে। আবার চেষ্টা করুন অথবা লিখে দিন।'));
  };
  recognition.onend=()=>{
    if(!isCurrentSession())return;
    recognitionRef.current=null;
    voiceStopRequestedRef.current=false;
    setVoiceListening(false);
  };

  try{
    recognition.start();
  }catch(error){
    console.error('SHONKET voice start error:',error);
    if(isCurrentSession()){
      recognitionRef.current=null;
      voiceSessionRef.current+=1;
      voiceStopRequestedRef.current=false;
      setVoiceListening(false);
      setVoiceError(t('Microphone could not start. Check its permission and try again.','মাইক্রোফোন চালু হয়নি। অনুমতি পরীক্ষা করে আবার চেষ্টা করুন।'));
    }
  }
}
function startVoice(){
  const activeRecognition=recognitionRef.current;
  if(activeRecognition){
    voiceStopRequestedRef.current=true;
    try{
      activeRecognition.stop();
    }catch(stopError){
      console.warn('SHONKET voice stop fallback:',stopError);
      try{activeRecognition.abort()}catch(abortError){console.warn('SHONKET voice abort fallback:',abortError)}
      if(recognitionRef.current===activeRecognition){
        recognitionRef.current=null;
        voiceSessionRef.current+=1;
        voiceStopRequestedRef.current=false;
        setVoiceListening(false);
      }
    }
    return;
  }
  beginVoiceRecognition();
}
function chooseScenario(i){if(choice!==null)return;setChoice(i);setSimDone(prev=>prev.includes(scenario)?prev:[...prev,scenario]);if(i===scenarios[scenario].correct&&!simDone.includes(scenario))setSimScore(s=>s+1)}
function resetSimulator(){setScenario(0);setChoice(null);setSimScore(0);setSimDone([]);setSimFinished(false)}
function nextScenario(){if(scenario===scenarios.length-1){setSimFinished(true);addHistory({type:'Awareness Training',title:`Completed ${scenarios.length}-scenario practice`,verdict:'completed',score:simScore,total:scenarios.length});return}setScenario(v=>v+1);setChoice(null)}
async function inspect(){
  const requestId=++linkInspectionRequestRef.current;
  linkOfficialSearchRef.current=null;
  setLinkBusy(false);
  setLinkAnalysis(null);

  let inspected;
  try {
    inspected=inspectUrl(url);
  } catch(error) {
    setUrlResult({
      error:String(error?.message || "Enter a valid HTTP or HTTPS website address.")
    });
    return;
  }

  setUrlResult(inspected);
  const searchRestricted=Boolean(inspected.publicSearchRestricted);
  addHistory({
    type:"Link Inspector",
    title:inspected.host,
    verdict:inspected.riskLevel,
    riskLevel:inspected.riskLevel,
    riskScore:inspected.riskScore
  });

  const linkContext=buildUrlReviewContext(inspected);
  const pendingEvidence={
    searched:!searchRestricted,
    searchExecuted:false,
    provider:"DuckDuckGo",
    status:searchRestricted?"restricted_category":"pending",
    domain:inspected.rootDomain,
    queryCount:0,
    successfulQueryCount:0,
    sourceCount:0,
    sources:[],
    summary_en:searchRestricted?"Web search is not run for age-restricted categories.":"Searching public web references for this domain.",
    summary_bn:searchRestricted?"বয়স-সীমাবদ্ধ ক্যাটাগরিতে ওয়েব সার্চ চালানো হয় না।":"এই ডোমেইন সম্পর্কে পাবলিক ওয়েব রেফারেন্স খোঁজা হচ্ছে।"
  };
  setLinkBusy(true);
  setLinkAnalysis({
    ...createLocalPreview({
      message:linkContext,
      language:analysisLanguage,
      status:"pending",
      contextType:"url"
    }),
    webEvidence:pendingEvidence
  });

  // Search only the hostname/base domain. The full path, query string,
  // fragments and potential reset tokens stay in the browser.
  if(searchRestricted) {
    linkOfficialSearchRef.current=pendingEvidence;
  } else searchDomainEvidence({
    hostname:inspected.host,
    rootDomain:inspected.rootDomain,
    categoryHint:inspected.restrictedSearchCategory||inspected.linkCategory
  }).then(payload=>{
    if(linkInspectionRequestRef.current!==requestId)return;
    const evidence=payload?.webEvidence||{
      ...pendingEvidence,
      status:"unavailable",
      searched:false,
      searchExecuted:false,
      summary_en:"No web-evidence response was returned.",
      summary_bn:"কোনো web-evidence response পাওয়া যায়নি।"
    };
    linkOfficialSearchRef.current=evidence;
    setLinkAnalysis(current=>current?{...current,webEvidence:evidence}:current);
  }).catch(error=>{
    if(linkInspectionRequestRef.current!==requestId)return;
    const evidence={
      ...pendingEvidence,
      status:"unavailable",
      searched:false,
      searchExecuted:false,
      sources:[],
      summary_en:"The live domain search failed. No reputation conclusion was made.",
      summary_bn:"লাইভ domain search ব্যর্থ হয়েছে। ডোমেইন সম্পর্কে কোনো reputation সিদ্ধান্ত দেওয়া হয়নি।"
    };
    linkOfficialSearchRef.current=evidence;
    setLinkAnalysis(current=>current?{...current,webEvidence:evidence}:current);
    console.warn("SHONKET domain search failed:",error);
  });

  try {
    const result=await analyzeMessage({
      message:linkContext,
      language:analysisLanguage,
      contextType:"url"
    });
    if(linkInspectionRequestRef.current===requestId) {
      setLinkAnalysis(current=>({
        ...result,
        webEvidence:linkOfficialSearchRef.current||current?.webEvidence||pendingEvidence
      }));
    }
  } catch(error) {
    if(linkInspectionRequestRef.current===requestId) {
      setLinkAnalysis(current=>current?{
        ...current,
        aiAnalysis:{
          ...current.aiAnalysis,
          status:"unavailable",
          note_en:"The AI explanation service is unavailable. The local URL structure checks and live domain search are shown separately.",
          note_bn:"AI ব্যাখ্যা সেবা পাওয়া যাচ্ছে না। স্থানীয় URL পরীক্ষা ও live domain search আলাদাভাবে দেখানো হচ্ছে।"
        },
        webEvidence:linkOfficialSearchRef.current||current.webEvidence||pendingEvidence
      }:current);
    }
  } finally {
    if(linkInspectionRequestRef.current===requestId) setLinkBusy(false);
  }
}
return <div id="home" className="min-h-screen overflow-hidden bg-[#080914] text-slate-100"><div className="pointer-events-none fixed inset-0 -z-0"><div className="grid-bg absolute inset-0 opacity-40"/><div className="absolute -left-48 top-20 h-[460px] w-[460px] rounded-full bg-violet-700/15 blur-[130px]"/><div className="absolute -right-40 top-[480px] h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[130px]"/></div>
<header className="relative z-30 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8"><Brand/><nav className="hidden items-center gap-8 md:flex">{nav.map(([id,label])=><button key={id} onClick={()=>go(id)} className={`nav-link ${active===id?'nav-link-active':''}`}>{label}</button>)}<a href="#about" className="nav-link">{t('About','পরিচিতি')}</a></nav><div className="hidden items-center gap-3 md:flex"><div className="flex items-center gap-1 rounded-full border border-white/10 p-1"><button onClick={()=>setLanguage('en')} className={"rounded-full px-3 py-2 text-xs font-bold transition-colors "+(language==='en'?'bg-violet-500 text-white':'text-slate-200 hover:bg-white/10 hover:text-white')}>EN</button><button onClick={()=>setLanguage('bn')} className={"rounded-full px-2.5 py-1.5 text-[10px] font-bold "+(language==='bn'?'bg-violet-500 text-white':'text-slate-200 hover:bg-white/10 hover:text-white')}>বাংলা</button></div><button onClick={()=>go('checker')} className="nav-cta group inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-extrabold leading-none">{t('Start checking','পরীক্ষা শুরু করুন')} <ArrowUpRight size={16}/></button></div><div className="flex items-center gap-2 md:hidden"><div className="flex gap-1 rounded-full border border-white/10 p-1"><button onClick={()=>setLanguage('en')} className={"rounded-full px-2 py-1 text-[10px] "+(language==='en'?'bg-violet-500 text-white':'text-slate-400')}>EN</button><button onClick={()=>setLanguage('bn')} className={"rounded-full px-2 py-1 text-[10px] "+(language==='bn'?'bg-violet-500 text-white':'text-slate-400')}>বাংলা</button></div><button className="rounded-xl border border-white/10 p-2" onClick={()=>setMobile(!mobile)} aria-label="Toggle navigation">{mobile?<X/>:<Menu/>}</button></div></header>
<div className="relative z-20 mx-auto -mt-1 mb-5 flex max-w-[1440px] justify-center px-4 sm:px-8">
  <img
    src={`${import.meta.env.BASE_URL}Built%20for%20AIgnite%202026.png`}
    alt="Official Built For Ostad Presents YUNet AIgnite Buildathon 2026 sticker"
    className="h-auto w-full max-w-[760px] object-contain"
    loading="eager"
  />
</div>
<AnimatePresence>{mobile&&<motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="relative z-20 mx-4 rounded-2xl border border-white/10 bg-[#111426] p-4 md:hidden">{nav.map(([id,label])=><button key={id} onClick={()=>go(id)} className="block w-full rounded-xl px-3 py-3 text-left text-slate-200 hover:bg-white/5">{label}</button>)}</motion.div>}</AnimatePresence>
<main className="relative z-10"><section className="mx-auto grid max-w-[1440px] items-center gap-8 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:pb-28 lg:pt-20"><motion.div><div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/[.07] px-3.5 py-2 text-xs font-semibold tracking-wide text-violet-200"><Sparkles size={14}/> {t('DIGITAL SAFETY, REIMAGINED','ডিজিটাল নিরাপত্তা, নতুনভাবে')} <span className="rounded-full bg-violet-300/15 px-2 py-0.5 text-[10px]">BETA</span></div><h1 className="title-3d max-w-3xl font-display text-[clamp(3.35rem,8vw,6.7rem)] font-bold leading-[.96] tracking-[-.075em]">{t('Don’t trust','বিশ্বাস করবেন না')}<br/><span className="text-gradient">{t('every signal.','প্রতিটি সংকেতকে।')}</span></h1><p className="mt-7 max-w-xl text-base leading-8 text-slate-400 sm:text-lg">{t('Understand suspicious messages, inspect unfamiliar links and build the instincts to stay safer online.','সন্দেহজনক বার্তা বুঝুন, অপরিচিত লিংক যাচাই করুন এবং অনলাইনে নিরাপদ থাকার অভ্যাস গড়ে তুলুন।')}</p><div className="mt-9 flex flex-wrap gap-3"><button onClick={()=>go('checker')} className="hero-cta hero-cta-primary group flex items-center gap-3 rounded-full px-6 py-4 text-sm font-extrabold">{t('Check a message','বার্তা যাচাই করুন')} <ArrowUpRight size={17}/></button><button onClick={()=>go('simulator')} className="hero-cta hero-cta-secondary flex items-center gap-2 rounded-full px-6 py-4 text-sm font-bold">{t('Practice safely','নিরাপদে অনুশীলন করুন')} <ArrowRight size={16}/></button></div><div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/10 pt-6 text-xs text-slate-500"><span className="flex items-center gap-2"><Globe2 size={14} className="text-cyan-300"/> {t('Bangla + English','বাংলা + ইংরেজি')}</span><span className="flex items-center gap-2"><LockKeyhole size={14} className="text-violet-300"/> {t('Privacy-conscious','গোপনীয়তাকে গুরুত্ব দেয়')}</span><span className="flex items-center gap-2"><Activity size={14} className="text-emerald-300"/> {t('Learn as you check','যাচাই করতে করতেই শিখুন')}</span></div></motion.div>
<motion.div className="relative mx-auto flex min-h-[390px] w-full max-w-[570px] items-center justify-center sm:min-h-[520px]"><div className="absolute h-[340px] w-[340px] rounded-full bg-violet-600/20 blur-[90px] sm:h-[440px] sm:w-[440px]"/><div className="hero-orbit hero-orbit-one absolute h-[310px] w-[310px] rounded-full sm:h-[420px] sm:w-[420px]"><span className="hero-orbit-dot"/></div><div className="hero-orbit hero-orbit-two absolute h-[260px] w-[360px] rounded-[50%] sm:h-[340px] sm:w-[470px]"><span className="hero-orbit-dot"/></div><div className="orb float relative h-52 w-52 rounded-full sm:h-64 sm:w-64"><div className="absolute inset-[18%] rounded-full border border-white/15"/><div className="absolute inset-x-0 top-1/2 h-20 -translate-y-1/2 overflow-hidden rounded-full"><div className="scanline h-1 w-full"/></div><div className="absolute inset-0 grid place-items-center"><Fingerprint size={76} strokeWidth={1} className="text-white/75 drop-shadow-[0_0_18px_rgba(93,221,255,.6)]"/></div></div><div className="glass absolute left-0 top-[15%] flex items-center gap-3 rounded-2xl px-4 py-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200"><ScanSearch size={19}/></span><span><b className="block text-xs">{t('Signal detected','ঝুঁকির সংকেত পাওয়া গেছে')}</b><small className="text-[10px] text-slate-400">{t('Rule-based pattern check','নিয়মভিত্তিক প্যাটার্ন পরীক্ষা')}</small></span></div><div className="glass absolute bottom-[13%] right-0 flex items-center gap-3 rounded-2xl px-4 py-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-300/10 text-violet-200"><ShieldCheck size={19}/></span><span><b className="block text-xs">{t('Stay one step ahead','এক ধাপ এগিয়ে থাকুন')}</b><small className="text-[10px] text-slate-400">{t('Awareness is protection','সচেতনতাই সুরক্ষা')}</small></span></div><div className="absolute right-[8%] top-[12%] h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_24px_6px_#35d9f280]"/></motion.div></section>
<section id="tools" className="scroll-mt-6 border-y border-white/[.07] bg-white/[.018] py-16 sm:py-20"><div className="mx-auto max-w-[1440px] px-5 sm:px-8"><div className="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-3 text-xs font-bold tracking-[.22em] text-cyan-300">{t('YOUR DIGITAL SAFETY TOOLKIT','আপনার ডিজিটাল নিরাপত্তার টুলকিট')}</p><h2 className="title-3d font-display text-3xl font-bold sm:text-4xl">{t("Three ways to get ahead of a scam.","প্রতারণা থেকে এগিয়ে থাকার তিনটি উপায়।")}</h2></div><p className="max-w-sm text-sm leading-6 text-slate-500">{t('Detect the warning signs, understand them, then practice what to do.','সতর্কতার লক্ষণ শনাক্ত করুন, বুঝুন এবং কী করতে হবে তা অনুশীলন করুন।')}</p></div><div className="grid gap-3 md:grid-cols-3">{[{id:'checker',n:'01',icon:MessageSquareText,title:t('Scam Checker','স্ক্যাম চেকার'),desc:t('Review suspicious SMS, chat messages and offers in Bangla or English.','বাংলা বা ইংরেজিতে সন্দেহজনক এসএমএস, চ্যাট ও অফার যাচাই করুন।'),color:'violet',action:t('Analyze a message','বার্তা বিশ্লেষণ করুন')},{id:'links',n:'02',icon:Link2,title:t('Smart Link Inspector','স্মার্ট লিংক ইন্সপেক্টর'),desc:t('Examine URL structure and spot patterns that deserve a closer look.','URL-এর গঠন পরীক্ষা করুন এবং সন্দেহজনক প্যাটার্ন শনাক্ত করুন।'),color:'cyan',action:t('Inspect a link','লিংক যাচাই করুন')},{id:'simulator',n:'03',icon:BrainCircuit,title:t('Scam Simulator','স্ক্যাম সিমুলেটর'),desc:t('Practice safe decisions in fictional scenarios inspired by common tactics.','পরিচিত প্রতারণার কৌশলভিত্তিক কাল্পনিক পরিস্থিতিতে নিরাপদ সিদ্ধান্ত নেওয়ার অনুশীলন করুন।'),color:'orange',action:t('Start a scenario','অনুশীলন শুরু করুন')}].map((item,index)=>{const Icon=item.icon;return <motion.button key={item.id} whileHover={{y:-9,rotateX:3,scale:1.015}} whileTap={{scale:.975,y:1}} onClick={()=>go(item.id)} className={`tool-card tool-${item.color} group relative overflow-hidden rounded-3xl p-6 text-left ${active===item.id?'is-active':''}`}><div className={`absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl ${item.color==='violet'?'bg-violet-500/15':item.color==='cyan'?'bg-cyan-400/10':'bg-orange-400/10'}`}/><div className="relative flex justify-between"><span className="text-xs font-bold tracking-widest text-slate-600">{item.n} / TOOL</span><ArrowUpRight size={18} className="text-slate-500 group-hover:text-white"/></div><div className={`relative mt-8 grid h-12 w-12 place-items-center rounded-2xl ${item.color==='violet'?'bg-violet-400/10 text-violet-200':item.color==='cyan'?'bg-cyan-300/10 text-cyan-200':'bg-orange-300/10 text-orange-200'}`}><Icon size={23}/></div><h3 className="relative mt-5 font-display text-xl font-bold">{item.title}</h3><p className="relative mt-2 min-h-[52px] text-sm leading-6 text-slate-400">{item.desc}</p><div className="relative mt-6 flex items-center gap-2 text-sm font-semibold">{item.action}<ChevronRight size={16}/></div></motion.button>})}</div>
<motion.div id="workspace-panel" className="mt-8 grid scroll-mt-24 gap-5 lg:grid-cols-[.75fr_1.25fr]"><div className="glass rounded-3xl p-6 sm:p-8"><div className="flex items-center gap-2 text-xs font-bold tracking-[.18em] text-violet-200"><Sparkles size={15}/> {t('INTERACTIVE WORKSPACE','ইন্টারঅ্যাকটিভ ওয়ার্কস্পেস')}</div><h3 className="mt-4 font-display text-2xl font-bold">{t('Your next safe move starts here.','আপনার নিরাপদ পরবর্তী পদক্ষেপ শুরু হোক এখান থেকে।')}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{t('Choose a tool and get a clearer view of what you are dealing with.','একটি টুল বেছে নিয়ে পরিস্থিতি আরও ভালোভাবে বুঝুন।')}</p><div className="workspace-tool-tabs mt-7 flex flex-wrap gap-3" aria-label={t('Workspace tools','ওয়ার্কস্পেস টুলসমূহ')}>{nav.map(([id,label])=><button key={id} type="button" onClick={()=>setActive(id)} aria-pressed={active===id} className={`workspace-tool-tab workspace-tool-tab-${id} ${active===id?'is-active':''}`} style={getWorkspaceToolButtonStyle(id,active===id)}>{id==='checker'?<ShieldCheck size={20} strokeWidth={2.35}/>:id==='links'?<Link2 size={20} strokeWidth={2.35}/>:id==='simulator'?<BrainCircuit size={20} strokeWidth={2.35}/>:<History size={20} strokeWidth={2.35}/>}<span>{label}</span></button>)}</div><div className="workspace-tool-note mt-6 flex items-start gap-2.5 text-xs text-slate-400"><span className="workspace-tool-note-dot mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-300"/><span>{t('Rule-based checks always available · AI explanations when enabled','নিয়মভিত্তিক পরীক্ষা সবসময় চালু · সক্রিয় থাকলে AI ব্যাখ্যা')}</span></div></div>
<div className="glass min-h-[390px] rounded-3xl p-5 sm:p-7"><AnimatePresence mode="wait">
{active==='checker'&&<motion.div key="checker" initial={{opacity:0,x:12}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-12}}><p className="text-xs font-bold tracking-[.16em] text-cyan-200">{t('MESSAGE ANALYSIS','বার্তা বিশ্লেষণ')}</p><div className="mt-2 flex items-center justify-between"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-display text-xl font-bold">{t('Check a suspicious message','সন্দেহজনক বার্তা যাচাই করুন')}</h3><div className="language-switch language-switch-violet" aria-label="Analysis response language"><button onClick={()=>{setAnalysisLanguage('auto');setAnalysis(null)}} className={"language-option "+(analysisLanguage==='auto'?'is-active':'is-idle')}>Auto</button><button onClick={()=>{setAnalysisLanguage('en');setAnalysis(null)}} className={"rounded-lg min-w-[48px] px-3 py-2 text-xs font-extrabold transition-all "+(analysisLanguage==='en'?'is-active':'is-idle')}>EN</button><button onClick={()=>{setAnalysisLanguage('bn');setAnalysis(null)}} className={"rounded-lg min-w-[48px] px-3 py-2 text-xs font-extrabold transition-all "+(analysisLanguage==='bn'?'bg-violet-500 text-white shadow-md shadow-violet-500/30 ring-1 ring-violet-300/50':'bg-white/[0.06] text-slate-100 hover:bg-white/15')}>বাংলা</button></div></div></div><div className="mt-5 rounded-2xl border border-white/10 bg-[#090c19]/80 p-4"><label htmlFor="message" className="mb-3 block text-xs font-semibold text-slate-300">{t('Paste message text','বার্তার লেখা পেস্ট করুন')}</label><div className="mb-3 flex flex-wrap items-center gap-2"><button type="button" onClick={startVoice} disabled={busy} aria-pressed={voiceListening} className={"inline-flex items-center gap-2 rounded-full border border-violet-300/25 bg-violet-300/[.07] px-3 py-2 text-xs font-semibold text-violet-100 transition "+(voiceListening?'border-rose-300/40 bg-rose-400/15 text-rose-100':'hover:bg-violet-300/[.12]')+" disabled:opacity-50"}>{voiceListening?<MicOff size={14}/>:<Activity size={14}/>}{voiceListening?t('Stop listening','শোনা বন্ধ করুন'):t('Speak','কথা বলুন')}</button><div className="language-switch language-switch-cyan" aria-label="Voice input language"><button type="button" aria-pressed={voiceInputLanguage==='en'} onClick={()=>{setVoiceInputLanguage('en');setVoiceError('')}} disabled={voiceListening} className={"language-option "+(voiceInputLanguage==='en'?'is-active':'is-idle')}>EN</button><button type="button" aria-pressed={voiceInputLanguage==='bn'} onClick={()=>{setVoiceInputLanguage('bn');setVoiceError('')}} disabled={voiceListening} className={"language-option "+(voiceInputLanguage==='bn'?'is-active':'is-idle')}>বাংলা</button></div><span className="text-[11px] text-slate-500">{t('Choose the language you will speak.','যে ভাষায় বলবেন সেটি বেছে নিন।')}</span></div><textarea id="message" value={message} onChange={e=>{setMessage(e.target.value);setAnalysis(null);setVoiceError('')}} maxLength={4000} placeholder={t("Example: Congratulations! You have won a prize. Verify your account now...","উদাহরণ: অভিনন্দন! আপনি পুরস্কার জিতেছেন। এখনই অ্যাকাউন্ট যাচাই করুন...")} className="min-h-[130px] w-full resize-y bg-transparent text-sm leading-6 text-white outline-none placeholder:text-slate-600"/><div className="screenshot-upload-area mt-3">
<div className="screenshot-upload-control">
<label htmlFor="screenshot-upload" className="screenshot-upload-trigger inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/[.07] px-4 py-2.5 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/[.13]"><Upload size={15}/>{t('Add screenshot','স্ক্রিনশট যোগ করুন')}</label>
<input type="file" id="screenshot-upload" accept="image/png,image/jpeg,image/webp" aria-describedby="screenshot-upload-hint" className="screenshot-file-input sr-only" onChange={e=>handleImage(e.target.files?.[0])}/>
</div>
<p id="screenshot-upload-hint" className="screenshot-upload-hint mt-2">{t('PNG, JPG or WebP · Up to 2.5 MB · Text is read in your browser','PNG, JPG অথবা WebP · সর্বোচ্চ ২.৫ MB · ছবির লেখা আপনার ব্রাউজারেই পড়া হয়')}</p>
{imageFile&&<div className="screenshot-preview-card mt-3" role="status" aria-live="polite">
<img src={imagePreview} alt="Screenshot preview" className="screenshot-preview-image"/>
<div className="screenshot-preview-details"><p className="screenshot-preview-name">{imageFile.name}</p><p className="screenshot-preview-size">{(imageFile.size/1024).toFixed(0)} KB · PNG/JPG/WebP</p><p className="screenshot-preview-ready">{t('Ready to read and analyze','পড়া ও বিশ্লেষণের জন্য প্রস্তুত')}</p></div>
<button type="button" onClick={removeImage} className="screenshot-remove-button">{t('Remove','সরান')}</button>
</div>}
</div>{voiceError&&<p role="alert" className="mt-2 text-xs text-orange-200">{voiceError}</p>}<div className="mt-3 flex justify-between border-t border-white/[.07] pt-3"><span className="text-[11px] text-slate-600">{message.length}/4000 characters</span><button onClick={()=>{setMessage('Congratulations! You have won a cash prize. Send a small processing fee now to claim your reward.');setAnalysis(null)}} className="text-xs font-semibold text-cyan-200">{t('Try sample','নমুনা দেখুন')}</button></div></div><div className="mt-5 flex w-full flex-col items-center gap-4 text-center"><p className="flex max-w-3xl items-start justify-center gap-2 text-center text-xs leading-6 text-slate-400"><LockKeyhole size={15} className="mt-1 shrink-0 text-cyan-300"/><span>{t('Your text may be sent to the SHONKET API for analysis. When LLM is enabled, a redacted copy may be processed by the AI provider. Never enter passwords, OTPs, PINs or account numbers.','বিশ্লেষণের জন্য আপনার লেখা SHONKET API-তে পাঠানো হতে পারে। LLM চালু থাকলে ব্যক্তিগত তথ্য বাদ দেওয়া একটি কপি AI provider প্রক্রিয়া করতে পারে। পাসওয়ার্ড, OTP, PIN বা অ্যাকাউন্ট নম্বর দেবেন না।')}</span></p><button disabled={(!message.trim()&&!imageFile)||busy||voiceListening} onClick={analyze} className="action-button action-violet flex min-w-[260px] items-center justify-center gap-3 rounded-full px-10 py-4 text-sm font-extrabold tracking-wide shadow-[0_8px_28px_rgba(99,102,241,0.32)] ring-1 ring-cyan-300/20 transition hover:scale-[1.02] hover:shadow-[0_12px_36px_rgba(139,92,246,0.42)] disabled:opacity-40" style={{background:"linear-gradient(110deg, #06b6d4 0%, #2563eb 48%, #7c3aed 100%)",color:"#ffffff",border:"1px solid rgba(165,243,252,.8)",boxShadow:"0 8px 28px rgba(37,99,235,.38)"}}>{busy?t('Checking signals...','সংকেত যাচাই হচ্ছে...'):t('Analyze message','বার্তা বিশ্লেষণ করুন')}<ArrowUpRight size={18}/></button></div>{analysisError&&<div role="alert" className="mt-4 rounded-xl border border-orange-300/25 bg-orange-300/[.07] p-3 text-xs text-orange-100">{analysisError}</div>}<AnimatePresence>{busy&&!analysis&&<motion.div key="analysis-loading" initial={{opacity:0,y:12,scale:.985}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-8,scale:.985}} transition={{duration:.25}} role="status" aria-live="polite" className="relative mt-5 overflow-hidden rounded-2xl border border-violet-300/20 bg-gradient-to-br from-[#11172c] via-[#10172a] to-[#0a1020] p-5 sm:p-6"><div className="pointer-events-none absolute inset-0 opacity-40" style={{backgroundImage:'radial-gradient(circle at 50% 0%, rgba(139,92,246,.22), transparent 55%)'}}/><div className="relative flex flex-col items-center text-center"><div className="relative grid h-20 w-20 place-items-center"><motion.div className="absolute inset-0 rounded-full border border-violet-300/30" animate={{scale:[1,1.18,1],opacity:[.65,.12,.65]}} transition={{duration:2.2,repeat:Infinity,ease:'easeInOut'}}/><motion.div className="absolute inset-2 rounded-full border border-cyan-300/30" animate={{rotate:360}} transition={{duration:7,repeat:Infinity,ease:'linear'}}/><motion.div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/25 bg-cyan-300/10 text-cyan-200 shadow-[0_0_30px_rgba(53,217,242,.16)]" animate={{boxShadow:['0 0 12px rgba(53,217,242,.12)','0 0 28px rgba(139,92,246,.35)','0 0 12px rgba(53,217,242,.12)']}} transition={{duration:1.8,repeat:Infinity}}><ShieldCheck size={25}/></motion.div></div><p className="mt-3 text-[10px] font-extrabold tracking-[.22em] text-cyan-200">{resultLanguage==='bn'?'নিরাপত্তা যাচাই চলছে':'SECURITY SCAN IN PROGRESS'}</p><h4 className="mt-2 font-display text-lg font-bold text-white">{resultLanguage==='bn'?'বার্তাটি বিশ্লেষণ করা হচ্ছে':'Analyzing your message'}</h4><p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">{resultLanguage==='bn'?'সন্দেহজনক সংকেত, প্রতারণার কৌশল এবং ঝুঁকির মাত্রা পরীক্ষা করা হচ্ছে।':'Checking suspicious signals, manipulation patterns and potential risk.'}</p><div className="relative mt-5 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-white/10"><motion.div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-violet-400 via-cyan-300 to-violet-400" animate={{x:['-120%','320%']}} transition={{duration:1.35,repeat:Infinity,ease:'easeInOut'}}/></div><div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500"><motion.span className="h-1.5 w-1.5 rounded-full bg-emerald-300" animate={{opacity:[1,.25,1]}} transition={{duration:1,repeat:Infinity}}/>{resultLanguage==='bn'?'অনুগ্রহ করে অপেক্ষা করুন...':'Please wait while the scan completes...'}</div></div></motion.div>}</AnimatePresence>{analysis&&analysis.isRelevant===false&&<motion.section initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} role="status" aria-live="polite" className="mt-4 overflow-hidden rounded-xl border border-rose-400/30 bg-[#1b1018]">
<div className="flex items-center justify-between gap-3 border-b border-rose-400/20 bg-rose-500/[.09] px-4 py-3"><div className="flex items-center gap-2 text-rose-200"><ScanSearch size={17}/><span className="text-xs font-extrabold tracking-wide">{resultLanguage==="bn"?"যাচাই সম্পন্ন":"CHECK COMPLETE"}</span></div><span className="rounded-full border border-rose-300/25 bg-rose-400/10 px-2.5 py-1 text-[10px] font-bold text-rose-200">{resultLanguage==="bn"?"অপ্রাসঙ্গিক ইনপুট":"OUT OF SCOPE"}</span></div>
<div className="p-4"><h4 className="text-lg font-extrabold text-white">{resultLanguage==="bn"?"এই ইনপুটটি স্ক্যাম-সম্পর্কিত নয়":"This input isn’t scam-related"}</h4><p className="mt-1.5 text-sm leading-5 text-slate-300">{resultLanguage==="bn"?"তাই কোনো Scam/Safe verdict বা risk score দেওয়া হয়নি।":"No scam verdict or risk score was generated for this unrelated content."}</p>
<p className="mt-3 text-xs leading-5 text-slate-400">{resultLanguage==="bn"?"SMS, WhatsApp/ Messenger মেসেজ, ইমেইল, চাকরি বা পুরস্কারের অফার, পেমেন্ট অনুরোধ অথবা সন্দেহজনক লিংক দিন।":"Submit an SMS, WhatsApp/Messenger message, email, job or prize offer, payment request, or suspicious link."}</p>
<button onClick={()=>{setMessage("");setAnalysis(null);setAiError("");}} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-300/30 bg-rose-400/10 px-3.5 py-2 text-xs font-bold text-rose-100 transition hover:bg-rose-400/20">{resultLanguage==="bn"?"আবার পরীক্ষা করুন":"Try another input"} <ArrowUpRight size={14}/></button></div></motion.section>}{analysis&&analysis.isRelevant!==false&&<div id="analysis-results" className="analysis-results mt-5 rounded-2xl border border-white/10 bg-[#0a1020] p-4 sm:p-5"><div className="mb-3 flex flex-wrap gap-2"><button onClick={speakAnalysis} disabled={speaking&&!speechPaused} className="flex items-center gap-2 rounded-full border border-cyan-300/25 px-3 py-2 text-xs font-semibold text-cyan-100 disabled:opacity-50">{t('Listen','শুনুন')} <Activity size={14}/></button>{speaking&&<><button onClick={pauseResumeSpeech} className="rounded-full border border-white/15 px-3 py-2 text-xs text-slate-200">{speechPaused?t('Resume','আবার চালু'):t('Pause','বিরতি')}</button><button onClick={stopSpeaking} className="rounded-full border border-orange-300/20 px-3 py-2 text-xs text-orange-100">{t('Stop','বন্ধ')}</button></>}{voiceOptions.length>0&&<select aria-label={t('Speech voice','কণ্ঠস্বর')} title={t('Choose a voice for speech playback','পড়ে শোনানোর কণ্ঠ বেছে নিন')} value={selectedVoice} onChange={e=>setSelectedVoice(e.target.value)} className="voice-select min-w-[190px] max-w-[260px] rounded-full border border-white/15 bg-[#101426] px-3 py-2.5 pr-8 text-sm font-medium leading-5 text-slate-100 outline-none transition hover:border-cyan-200/40 focus:border-cyan-200/60 focus:ring-2 focus:ring-cyan-300/15"><option value="">{t('Default voice','ডিফল্ট কণ্ঠ')}</option>{selectableVoiceOptions.map(v=><option key={v.name+'-'+v.lang} value={v.name}>{v.name} · {v.lang}</option>)}</select>}{speaking&&<span className="self-center text-[10px] text-slate-400">{speechPaused?t('Paused','বিরতিতে'):t('Speaking…','পড়ে শোনানো হচ্ছে…')}</span>}</div><AnalysisExportActions analysis={analysis} message={message} language={resultLanguage}/><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-[10px] font-bold tracking-[.18em] text-cyan-200">{analysis.engine==='Rule-based'?(resultLanguage==='bn'?'দ্রুত নিয়মভিত্তিক যাচাই':'INSTANT RULE-BASED CHECK'):(resultLanguage==='bn'?'নিয়মভিত্তিক যাচাই':'RULE-BASED CHECK')}</span><h4 className="mt-2 font-display text-lg font-bold">{resultLanguage==='bn'?(analysis.verdict==='scam'?'সম্ভাব্য প্রতারণা':analysis.verdict==='suspicious'?'সন্দেহজনক বার্তা':analysis.verdict==='likely_safe'?'প্রতারণার স্পষ্ট সংকেত পাওয়া যায়নি':'পর্যাপ্ত তথ্য নেই'):(analysis.verdict==='scam'?'Likely scam':analysis.verdict==='suspicious'?'Suspicious message':analysis.verdict==='likely_safe'?'No strong scam signals found':'Not enough information')}</h4><span className="mt-2 inline-flex rounded-full bg-rose-400/15 px-3 py-1 text-[10px] font-bold text-rose-100">{resultLanguage==='bn'?(analysis.riskLevel==='critical'?'অতি উচ্চ ঝুঁকি':analysis.riskLevel==='high'?'উচ্চ ঝুঁকি':analysis.riskLevel==='medium'?'মাঝারি ঝুঁকি':'কম ঝুঁকি'):String(analysis.riskLevel||'unknown').toUpperCase()+' RISK'}</span></div><div className="text-right"><span className="block text-[10px] text-slate-500">{resultLanguage==='bn'?'নিয়মভিত্তিক ঝুঁকি স্কোর':'Rule-based risk score'}</span><strong className="font-display text-3xl text-cyan-100">{analysis.riskScore}<small className="text-sm text-slate-500">/100</small></strong></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><motion.div initial={{width:0}} animate={{width:analysis.riskScore+'%'}} transition={{duration:.8}} className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500"/></div><p className="mt-4 text-sm leading-6 text-slate-200">{resultLanguage==='bn'?analysis.summary_bn:analysis.summary_en}</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><h5 className="mb-2 text-xs font-bold text-white">{resultLanguage==='bn'?'কেন সতর্ক করা হয়েছে':'Why it was flagged'}</h5>{analysis.evidence?.length?<ul className="space-y-2">{analysis.evidence.map((e,i)=><li key={i} className="rounded-xl border border-white/[.07] bg-white/[.025] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-amber-200/80">{resultLanguage==='bn'?'শনাক্ত সংকেত':'Detected clue'}</p><p className="mt-1 text-xs leading-5 text-slate-300">{resultLanguage==='bn'?e.reason_bn:e.reason_en}</p></li>)}</ul>:<p className="text-xs text-slate-500">No specific evidence snippets returned.</p>}</div><div><h5 className="mb-2 text-xs font-bold text-white">{resultLanguage==='bn'?'প্রতারণার কৌশল':'Manipulation patterns'}</h5><div className="flex flex-wrap gap-2">{analysis.tactics?.length?analysis.tactics.map((t,i)=>{const bnTactics={"urgency":"জরুরি চাপ সৃষ্টি","otp_request":"ওটিপি চাওয়া","otp/password request":"ওটিপি বা পাসওয়ার্ড চাওয়া","credential_request":"গোপন তথ্য চাওয়া","impersonation":"পরিচয় নকল","fake prize":"ভুয়া পুরস্কার","fake_prize":"ভুয়া পুরস্কার","fake prizes":"ভুয়া পুরস্কার","upfront fee":"আগাম টাকা চাওয়া","upfront_fee":"আগাম টাকা চাওয়া","upfront fees":"আগাম টাকা চাওয়া","fake job promises":"ভুয়া চাকরির প্রতিশ্রুতি","adult-content bait":"প্রাপ্তবয়স্ক কনটেন্টের প্রলোভন","adult_content_bait":"প্রাপ্তবয়স্ক কনটেন্টের প্রলোভন","suspicious link":"সন্দেহজনক লিংক","suspicious_link":"সন্দেহজনক লিংক","curiosity bait":"কৌতূহল তৈরি করে প্রলুব্ধ করা","curiosity_bait":"কৌতূহল তৈরি করে প্রলুব্ধ করা","luring with money":"টাকার লোভ দেখানো"};const tacticKey=String(t).trim().toLowerCase();return <span key={i} className="rounded-full border border-violet-300/20 bg-violet-300/[.07] px-2.5 py-1.5 text-[10px] text-violet-100">{resultLanguage==='bn'?(bnTactics[tacticKey]||t.replace(/[_-]+/g,' ')):t}</span>}):<span className="text-xs text-slate-500">No clear tactic identified.</span>}</div><h5 className="mb-2 mt-4 text-xs font-bold text-white">{resultLanguage==='bn'?'এখন কী করবেন':'What to do next'}</h5><ul className="space-y-2">{analysis.safe_actions?.map((a,i)=><li key={i} className="flex gap-2 text-xs leading-5 text-slate-300"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300"/>{a}</li>)}</ul></div></div>{analysis.aiAnalysis&&<section className="ai-explanation-panel mt-4 rounded-2xl border border-violet-300/25 bg-violet-300/[.045] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-extrabold tracking-[.16em] text-violet-100">{resultLanguage==='bn'?'AI ব্যাখ্যা':'AI EXPLANATION'}</p><span className="rounded-full border border-violet-300/20 bg-violet-300/[.07] px-2 py-1 text-[9px] font-bold text-violet-100">{analysis.aiAnalysis.status==='ready'?'LLM ACTIVE':analysis.aiAnalysis.status==='pending'?'AI EXPLANATION PENDING':analysis.aiAnalysis.status==='unavailable'?'LLM UNAVAILABLE':analysis.aiAnalysis.status==='not_configured'?'LLM NOT CONFIGURED':'LOCAL RULES ONLY'}</span></div>{analysis.aiAnalysis.status==='ready'?<><p className="mt-3 text-xs leading-6 text-slate-200">{resultLanguage==='bn'?analysis.aiAnalysis.explanation_bn:analysis.aiAnalysis.explanation_en}</p>{(resultLanguage==='bn'?analysis.aiAnalysis.next_steps_bn:analysis.aiAnalysis.next_steps_en)?.length>0&&<ul className="mt-3 space-y-2">{(resultLanguage==='bn'?analysis.aiAnalysis.next_steps_bn:analysis.aiAnalysis.next_steps_en).map((step,i)=><li key={i} className="flex gap-2 text-xs leading-5 text-slate-300"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-violet-200"/>{step}</li>)}</ul>}</>:<p className="mt-3 text-xs leading-5 text-slate-300">{resultLanguage==='bn'?analysis.aiAnalysis.note_bn:analysis.aiAnalysis.note_en}</p>}</section>}<section className="limitations-card mt-4" aria-label={resultLanguage==='bn'?'সীমাবদ্ধতা ও অনিশ্চয়তা':'Limitations and uncertainty'}>
<h4 className="limitations-heading">{resultLanguage==='bn'?'সীমাবদ্ধতা ও অনিশ্চয়তা':'LIMITATIONS & UNCERTAINTY'}</h4>
<p className="limitations-body">{analysis.aiAnalysis?.status==='ready'?(resultLanguage==='bn'?'ঝুঁকির রায় ও স্কোর নিয়মভিত্তিক; LLM ব্যাখ্যা যোগ করে। প্রেরক, লিংক বা দাবির সত্যতা স্বাধীনভাবে যাচাই করা হয়নি।':'The verdict and risk score are rule-based; the LLM adds an explanation. The sender, link, and factual claim have not been independently verified.'):analysis.uncertainty}</p>
<div className="limitations-meta">
<span className="limitations-confidence"><span>{resultLanguage==='bn'?'আত্মবিশ্বাসের মাত্রা':'Confidence'}</span><strong>{resultLanguage==='bn'?(analysis.confidence==='high'?'উচ্চ':analysis.confidence==='medium'?'মাঝারি':'কম'):analysis.confidence}</strong></span>
<span className="limitations-footnote">{analysis.aiAnalysis?.status==='ready'?(resultLanguage==='bn'?'রায় ও স্কোর নিয়মভিত্তিক; LLM ব্যাখ্যা সহায়তা করে। এটি প্রতারণা বা নিরাপত্তার চূড়ান্ত প্রমাণ নয়।':'Verdict and score are rule-based; the LLM provides supporting explanation. This is not proof of fraud or safety.'):resultLanguage==='bn'?'এটি নিয়মভিত্তিক সহায়ক মূল্যায়ন, প্রতারণা বা নিরাপত্তার চূড়ান্ত প্রমাণ নয়।':'Rule-based assessment, not proof of fraud or safety.'}</span>
</div>
</section>
<div id="analysis-evidence-stack" className="analysis-evidence-stack" aria-label={resultLanguage==='bn'?'ওয়েব ও সরকারি উৎসের প্রমাণ':'Web and official-source evidence'}>
{analysis.webEvidence?.searched&&<section id="web-evidence-panel" className="web-evidence-panel mt-4 rounded-2xl p-4 sm:p-5">
<div className="web-evidence-header flex flex-wrap items-center justify-between gap-3">
<div className="flex min-w-0 items-center gap-3">
<span className="web-evidence-heading-icon grid h-11 w-11 shrink-0 place-items-center rounded-2xl"><Globe2 size={22}/></span>
<div className="min-w-0"><p className="text-xs font-extrabold tracking-[.15em] text-cyan-100 sm:text-sm">{resultLanguage==='bn'?'নির্বাচিত অফিসিয়াল উৎস থেকে পাওয়া রেফারেন্স':'WEB EVIDENCE · SELECTED OFFICIAL SOURCES'}</p><p className="mt-1 text-sm leading-6 text-slate-300">{(() => {
const bn=resultLanguage==='bn';
const status=analysis.webEvidence.status;
const hasSources=analysis.webEvidence.sources?.length>0;
if(status==='pending') return bn?'নির্বাচিত অফিসিয়াল উৎস অনুসন্ধান চলছে। ফলাফল পাওয়া গেলে এখানে দেখানো হবে।':'Checking selected official sources. Results will appear here as soon as they arrive.';
if(!hasSources) return ['unavailable','partial_unavailable'].includes(status)
  ?(bn?'নির্বাচিত উৎসে সংযোগ সম্পন্ন হয়নি। দাবির বিষয়ে সিদ্ধান্ত দেওয়া যাচ্ছে না।':'The selected sources could not be checked completely. No conclusion can be made about the claim.')
  :(bn?'নির্বাচিত উৎসে মিলে যাওয়া রেফারেন্স পাওয়া যায়নি। এতে দাবিটি মিথ্যা প্রমাণ হয় না।':'No matching references were found in the selected sources. This does not prove the claim is false.');
if(['guidance_only','partial_guidance'].includes(status)) return bn?'সাধারণ নিরাপত্তা নির্দেশনা পাওয়া গেছে; এই নির্দিষ্ট দাবির সঙ্গে মেলা কোনো নোটিশ নিশ্চিত হয়নি।':'General safety guidance was retrieved; no notice matching this specific claim was confirmed.';
if(['results_found','partial_results'].includes(status)) return bn?'সম্পর্কিত অফিসিয়াল নোটিশের রেফারেন্স পাওয়া গেছে; মূল নোটিশ খুলে শর্ত যাচাই করুন।':'Related official notice references were retrieved; open the original notice to verify its details.';
return bn?'নির্বাচিত উৎস থেকে রেফারেন্স পাওয়া গেছে; মূল উৎস যাচাই করুন।':'References were retrieved from selected sources; review the original pages.';
})()}</p></div>
</div>
<div className="web-evidence-count shrink-0">{analysis.webEvidence.status==='pending'?<><span className="evidence-loading-dot"/><span>{resultLanguage==='bn'?'উৎস খোঁজা হচ্ছে':'SEARCHING SOURCES'}</span></>:<><FileText size={14}/><span>{analysis.webEvidence.officialSourcesFound||0} {resultLanguage==='bn'?'টি উৎস পাওয়া গেছে':'SOURCES RETRIEVED'}</span></>}</div>
</div>
{analysis.webEvidence.sources?.length>0&&<div className="web-evidence-list mt-4 grid gap-3">{analysis.webEvidence.sources.map((source,i)=>{const host=getLiveSourceDomain(source);const isGov=host.endsWith('.gov.bd');const isEdu=host.endsWith('.edu.bd');const sourceKind=isGov?(resultLanguage==='bn'?'সরকারি ডোমেইন':'Government domain'):isEdu?(resultLanguage==='bn'?'শিক্ষা-প্রতিষ্ঠান ডোমেইন':'Education domain'):(resultLanguage==='bn'?'অন্যান্য উৎস':'Other source');return <a key={source.url||i} href={source.url} target="_blank" rel="noopener noreferrer" className="web-evidence-source group flex min-w-0 items-center gap-3 rounded-2xl p-3.5 transition sm:gap-4 sm:p-4">
<span className="web-evidence-logo-wrap shrink-0"><LiveSourceLogo source={source} compact/></span>
<span className="min-w-0 flex-1"><span className="block text-sm font-extrabold leading-6 text-slate-100 group-hover:text-cyan-100 sm:text-base">{source.title}</span><span className="web-evidence-source-meta mt-1.5 flex flex-wrap items-center gap-2"><span className="web-evidence-domain">{host||source.domain||'Source website'}</span><span className="web-evidence-domain-type">{sourceKind}</span></span></span>
<span className="web-evidence-open shrink-0" aria-hidden="true"><ExternalLink size={16}/></span>
</a>})}</div>}
<p className="web-evidence-disclaimer mt-4 flex items-start gap-2.5 text-xs leading-6 text-slate-400"><Info size={16} className="mt-1 shrink-0 text-cyan-200"/><span>{resultLanguage==='bn'?'ডোমেইন শ্রেণিবিভাগ কোনো প্রতিষ্ঠানের সত্যতা বা নির্দিষ্ট অফারকে প্রমাণ করে না। প্রকাশিত নোটিশ নিজে খুলে বিস্তারিত মিলিয়ে নিন।':'A domain category does not authenticate an organisation or prove this exact offer. Open the notice and compare the details yourself.'}</span></p>
</section>}{analysis.claimVerification?.status&&analysis.claimVerification.status!=='not_applicable'&&<section className="claim-verification-panel mt-4 rounded-2xl p-4 sm:p-5" aria-label={resultLanguage==='bn'?'দাবি যাচাইয়ের অবস্থা':'Claim verification status'}>
<div className="claim-verification-header flex flex-wrap items-center justify-between gap-3">
<div className="flex min-w-0 items-center gap-3"><span className="claim-verification-icon grid h-11 w-11 shrink-0 place-items-center rounded-2xl"><ShieldCheck size={22}/></span><div><p className="text-xs font-extrabold tracking-[.15em] text-amber-100 sm:text-sm">{resultLanguage==='bn'?'দাবি যাচাই':'CLAIM VERIFICATION'}</p><p className="mt-1 text-[11px] font-semibold text-slate-400">{resultLanguage==='bn'?'নির্দিষ্ট দাবির তথ্য-প্রমাণের অবস্থা':'Evidence status for this specific claim'}</p></div></div>
<span className="claim-verification-status"><AlertTriangle size={13}/>{String(analysis.claimVerification.status).replace(/_/g,' ').toUpperCase()}</span>
</div>
<p className="claim-verification-summary mt-4 text-sm leading-7 text-slate-200">{resultLanguage==='bn'?(analysis.claimVerification.summary_bn||analysis.claimVerification.officialSearchSummary_bn||'দাবিটির নির্দিষ্ট তথ্য স্বাধীনভাবে নিশ্চিত করা যায়নি.'):(analysis.claimVerification.summary_en||analysis.claimVerification.officialSearchSummary_en||'The specific details of this claim have not been independently confirmed.')}</p>
<div className="claim-verification-stats mt-4 flex flex-wrap items-center gap-2.5">
{officialPortalCount>0&&<span className="claim-stat-chip claim-stat-portals"><Globe2 size={15}/><strong>{officialPortalCount}</strong><span>{resultLanguage==='bn'?'টি অফিসিয়াল পোর্টাল পরীক্ষা':'official portals checked'}</span></span>}
{analysis.claimVerification.officialSourceCount>0&&<span className="claim-stat-chip claim-stat-sources"><FileText size={15}/><strong>{analysis.claimVerification.officialSourceCount}</strong><span>{resultLanguage==='bn'?'টি রেফারেন্স পাওয়া':'references retrieved'}</span></span>}
{analysis.claimVerification.officialEvidenceStatus==='related_official_notice'&&<span className="claim-stat-chip claim-stat-related"><ShieldCheck size={15}/><span>{resultLanguage==='bn'?'সম্পর্কিত নোটিশ পাওয়া গেছে':'Related notice found'}</span></span>}
{analysis.claimVerification.officialEvidenceStatus==='contextual_guidance'&&<span className="claim-stat-chip claim-stat-guidance"><Info size={15}/><span>{resultLanguage==='bn'?'সাধারণ নিরাপত্তা নির্দেশনা':'General safety guidance only'}</span></span>}
{analysis.claimVerification.officialEvidenceStatus==='no_matching_notice_found'&&<span className="claim-stat-chip claim-stat-unmatched"><AlertTriangle size={15}/><span>{resultLanguage==='bn'?'মিলে যাওয়া নোটিশ পাওয়া যায়নি':'No matching notice found'}</span></span>}
{analysis.claimVerification.officialSearchStatus==='unavailable'&&<span className="claim-stat-chip claim-stat-unmatched"><AlertTriangle size={15}/><span>{resultLanguage==='bn'?'সার্চে সংযোগ হয়নি':'Search unavailable'}</span></span>}
</div>
<div className="claim-verification-disclaimer mt-4 flex items-start gap-2.5 rounded-xl px-3.5 py-3.5"><Info size={16} className="mt-0.5 shrink-0 text-amber-200"/><p className="text-xs leading-6 text-slate-300">{resultLanguage==='bn'?'এই অবস্থা শুধু দাবির তথ্য-প্রমাণ বোঝায়। এটি প্রেরকের পরিচয় নিশ্চিত করে না এবং লিংক নিরাপদ—এমন নিশ্চয়তা দেয় না।':'This status assesses available evidence about the claim only. It does not authenticate the sender or prove that an application link is safe.'}</p></div>
</section>}{analysis.officialSearch&&analysis.officialSearch.status!=='not_applicable'&&<div className="mt-5 space-y-4">
<section className="web-search-references relative overflow-hidden rounded-2xl border border-sky-300/35 bg-[linear-gradient(145deg,rgba(8,25,48,.96),rgba(11,15,34,.98)_58%,rgba(25,18,53,.92))] p-4 shadow-[0_18px_45px_rgba(0,0,0,.24)] sm:p-5">
<div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-400/[.08] blur-3xl"/>
<div className="relative">
<div className="flex flex-wrap items-center justify-between gap-3">
<div className="flex min-w-0 items-center gap-3">
<span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/35 bg-cyan-300/10 text-cyan-200 shadow-[0_0_26px_rgba(34,211,238,.12)]"><Globe2 size={22}/></span>
<div className="min-w-0"><p className="text-[10px] font-extrabold tracking-[.18em] text-cyan-100">{resultLanguage==='bn'?'ওয়েব সার্চ রেফারেন্স':'WEB SEARCH REFERENCES'}</p><h3 className="mt-1 font-display text-lg font-extrabold tracking-tight text-white sm:text-xl">{resultLanguage==='bn'?'বিশ্বস্ত উৎস থেকে পাওয়া রেফারেন্স':'Live references from trusted sources'}</h3><p className="mt-1 text-[11px] leading-5 text-slate-400">{resultLanguage==='bn'?'নির্বাচিত সরকারি ও প্রাতিষ্ঠানিক ওয়েবসাইট থেকে পাওয়া ফলাফল।':'Results retrieved from selected official and institutional websites.'}</p></div>
</div>
<span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-300/[.08] px-3 py-2 text-[9px] font-extrabold tracking-[.12em] text-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_9px_#6ee7b7]"/>{resultLanguage==='bn'?'লাইভ সার্চ':'LIVE WEB SEARCH'}</span>
</div>
<div className="mt-4 flex items-start gap-2 rounded-xl border border-sky-300/25 bg-sky-300/[.06] px-3 py-3"><Info size={15} className="mt-0.5 shrink-0 text-sky-200"/><p className="text-[11px] leading-5 text-sky-50/90">{resultLanguage==='bn'?'এগুলো বার্তাটি যাচাই করতে পাওয়া reference source। এখানে নির্বাচিত উৎস অনুসন্ধান করা হয়; পুরো ইন্টারনেট নয়।':'These are reference sources retrieved to help assess the message. Search covers selected sources, not the entire web.'}</p></div>
<div className="official-source-search-panel mt-4 rounded-2xl border border-white/10 bg-[#080e1d]/75 p-3 sm:p-4">
<div className="flex flex-wrap items-center justify-between gap-2">
<div className="flex items-center gap-2"><ShieldCheck size={17} className="text-cyan-200"/><p className="text-[10px] font-extrabold tracking-[.14em] text-white">{resultLanguage==='bn'?'লাইভ সরকারি ও প্রাতিষ্ঠানিক উৎস অনুসন্ধান':'LIVE OFFICIAL-SOURCE SEARCH'}</p></div>
<span className={`rounded-full border px-2.5 py-1 text-[9px] font-extrabold tracking-wide ${['results_found','partial_results'].includes(analysis.officialSearch.status)?'border-emerald-300/30 bg-emerald-300/10 text-emerald-200':analysis.officialSearch.status==='guidance_only'||analysis.officialSearch.status==='partial_guidance'?'border-sky-300/30 bg-sky-300/10 text-sky-100':analysis.officialSearch.status==='pending'?'border-cyan-300/30 bg-cyan-300/10 text-cyan-100':analysis.officialSearch.status==='no_results'?'border-amber-300/30 bg-amber-300/10 text-amber-100':'border-rose-300/30 bg-rose-300/10 text-rose-200'}`}>{analysis.officialSearch.status==='pending'?'SEARCHING OFFICIAL SOURCES':analysis.officialSearch.status==='partial_results'?'PARTIAL RESULTS':analysis.officialSearch.status==='partial_guidance'?'PARTIAL GUIDANCE':analysis.officialSearch.status==='guidance_only'?'OFFICIAL GUIDANCE':analysis.officialSearch.status==='partial_unavailable'?'PARTIAL SEARCH':analysis.officialSearch.status==='results_found'?'MATCHING NOTICES':analysis.officialSearch.status==='no_results'?'NO MATCHES':analysis.officialSearch.status==='unavailable'?'SEARCH UNAVAILABLE':analysis.officialSearch.status==='backend_not_connected'?'BACKEND NOT CONNECTED':'SEARCH STATUS'}</span>
</div>
<p className="mt-3 text-xs leading-6 text-slate-200">{resultLanguage==='bn'?analysis.officialSearch.summary_bn:analysis.officialSearch.summary_en}</p>
{analysis.officialSearch.failedPortalCount>0&&<p className="mt-2 flex items-start gap-2 text-[10px] leading-5 text-amber-200"><AlertTriangle size={13} className="mt-0.5 shrink-0"/>{resultLanguage==='bn'?'কিছু উৎস থেকে উত্তর পাওয়া যায়নি। তাই অনুসন্ধান আংশিক।':'Some selected sources did not respond, so this search is partial.'}</p>}
{analysis.officialSearch.evidenceAssessment&&analysis.officialSearch.evidenceAssessment.status!=='contextual_guidance'&&<div className="mt-3 rounded-lg border border-violet-300/20 bg-violet-300/[.06] p-3"><p className="text-[9px] font-extrabold tracking-[.12em] text-violet-200">{resultLanguage==='bn'?'দাবি বনাম সরকারি নোটিশ':'CLAIM VS OFFICIAL NOTICE'}</p><p className="mt-1.5 text-[11px] leading-5 text-slate-300">{resultLanguage==='bn'?analysis.officialSearch.evidenceAssessment.summary_bn:analysis.officialSearch.evidenceAssessment.summary_en}</p></div>}
{analysis.officialSearch.sources?.length>0?<div className="official-search-results mt-4 grid gap-3.5">
{analysis.officialSearch.sources.map((source,i)=><a key={source.id||source.url||i} href={source.url} target="_blank" rel="noopener noreferrer" className="official-search-result-card group">
<div className="official-source-card-head">
<span className="official-source-logo-shell"><LiveSourceLogo source={source}/></span>
<span className="official-source-brand-meta">
<span className="official-source-publisher">{source.agency}</span>
<span className="official-source-domain">{getLiveSourceDomain(source)||source.agency}</span>
</span>
<span className="official-source-labels">
<span className="official-source-evidence-pill"><ShieldCheck size={12}/>{resultLanguage==='bn'?(source.evidenceTypeLabel_bn||'প্রাতিষ্ঠানিক রেফারেন্স'):(source.evidenceTypeLabel_en||'OFFICIAL SOURCE REFERENCE')}</span>
<span className="official-source-type-pill"><Globe2 size={12}/>{resultLanguage==='bn'?'ওয়েব সার্চ ফলাফল':'WEB SEARCH RESULT'}</span>
</span>
</div>
<span className="official-source-title">{source.title}</span>
{source.publishedDate&&<span className="official-source-published">{resultLanguage==='bn'?'প্রকাশের তারিখ':'Published'} · {source.publishedDate}</span>}
{source.matchedTerms?.length>0&&<span className="official-source-matched"><span className="official-source-matched-label">{resultLanguage==='bn'?'মিল পাওয়া শব্দ':'MATCHED TERMS'}</span>{source.matchedTerms.map(term=><span key={term} className="official-source-term">{term}</span>)}</span>}
<span className="official-source-usefulness"><strong>{resultLanguage==='bn'?'এই উৎসটি কীভাবে কাজে লাগবে':'WHY THIS SOURCE HELPS'}</strong>{source.evidenceType==='government_listing_match'?(resultLanguage==='bn'?'নোটিশের শিরোনাম, অঙ্ক, তারিখ ও যোগ্যতা বার্তার দাবির সঙ্গে মিলিয়ে দেখুন। এটি প্রেরকের পরিচয় নিশ্চিত করে না।':'Compare the notice title, amount, date and eligibility with the message. It does not authenticate the sender.'):source.evidenceType==='official_listing_context'?(resultLanguage==='bn'?'অফিসিয়াল তালিকায় বিজ্ঞপ্তির নাম ও আবেদনের সময়সীমা মিলিয়ে নিন।':'Use the official listing to compare the vacancy or programme name and application dates.'): (resultLanguage==='bn'?'এই নির্দেশনা মিলে যাওয়া scam pattern বা নিরাপদ করণীয় বুঝতে সাহায্য করে; এটি এই নির্দিষ্ট বার্তা বা প্রেরককে সত্যায়ন করে না。':'This guidance helps explain the matching scam pattern or safer next steps; it does not verify this exact message or sender.')}</span><span className="official-source-excerpt">{source.excerpt}</span>
<span className="official-source-open-button" data-source-brand={getSourceBrand(source)?.key || "default"}><ExternalLink size={15}/>{source.evidenceType==='government_listing_match'?(resultLanguage==='bn'?'মূল সরকারি নোটিশ খুলুন':'OPEN ORIGINAL GOVERNMENT NOTICE'):source.evidenceType==='official_listing_context'?(resultLanguage==='bn'?'সরকারি নিয়োগ তালিকা খুলুন':'OPEN OFFICIAL RECRUITMENT LISTING'):(resultLanguage==='bn'?'মূল নিরাপত্তা নির্দেশনা খুলুন':'OPEN ORIGINAL SAFETY GUIDANCE')}<ArrowUpRight size={15}/></span>
</a>)}
</div>:analysis.officialSearch.status==='pending'?<div className="official-search-pending mt-4" role="status" aria-live="polite"><span className="official-search-spinner"/><div><p className="text-xs font-bold text-cyan-100">{resultLanguage==='bn'?'সরকারি উৎস পরীক্ষা করা হচ্ছে':'Checking official source listings'}</p><p className="mt-1 text-[11px] leading-5 text-slate-400">{resultLanguage==='bn'?'পোর্টালগুলো থেকে ফলাফল আসার সঙ্গে সঙ্গে এখানে যোগ হবে।':'Results will be added here as each selected portal responds.'}</p></div></div>:<div className="mt-4 rounded-xl border border-dashed border-amber-200/20 bg-amber-200/[.035] p-4"><p className="text-xs font-bold text-amber-100">{resultLanguage==='bn'?'কোনো matching notice পাওয়া যায়নি':'No matching notice was found'}</p><p className="mt-1 text-[11px] leading-5 text-slate-400">{resultLanguage==='bn'?'এটি দাবিটি মিথ্যা প্রমাণ করে না। নিচের সাধারণ নিরাপত্তা নির্দেশনা প্রাসঙ্গিক হতে পারে।':'This does not prove the claim is false. General safety guidance may still be relevant.'}</p></div>}
{analysis.officialSearch.searchedPortals?.length>0&&<div className="mt-4 border-t border-white/10 pt-3"><p className="mb-2 text-[9px] font-extrabold tracking-[.13em] text-slate-400">{resultLanguage==='bn'?'যেসব উৎস অনুসন্ধান করা হয়েছে':'SEARCHED SOURCES'}</p><div className="flex flex-wrap gap-1.5">{analysis.officialSearch.searchedPortals.map((portal,i)=><span key={portal.agency||i} className="searched-portal-chip inline-flex min-w-0 items-center gap-2 rounded-2xl border border-slate-400/20 bg-white/[.035] px-2.5 py-2 text-[10px] font-semibold text-slate-300"><LiveSourceLogo source={portal} compact/><span className="min-w-0"><span className="block font-bold text-slate-100">{portal.agency}</span><span className="mt-0.5 block text-[9px] text-slate-400">{getLiveSourceDomain(portal)}</span></span></span>)}</div></div>}
<p className="mt-3 text-[10px] leading-5 text-slate-500">{resultLanguage==='bn'?(analysis.officialSearch.scopeNote_bn||'অনুসন্ধানটি নির্বাচিত official source-এ সীমাবদ্ধ। উৎসের বাইরে কোনো দাবি যাচাই করা হয়নি।'):(analysis.officialSearch.scopeNote_en||'Search is limited to selected official sources. Claims outside those sources were not verified.')}</p>
</div>
</div>
</section></div>}
{analysis.retrievedSources?.length>0&&<section className="retrieved-guidance-panel rounded-2xl border border-violet-300/30 bg-[linear-gradient(145deg,rgba(28,20,56,.48),rgba(10,15,31,.97)_52%,rgba(14,26,43,.88))] p-4 shadow-[0_16px_42px_rgba(0,0,0,.24)] sm:p-5">
<div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-300/35 bg-violet-300/10 text-violet-100"><FileText size={20}/></span><div className="min-w-0"><p className="text-xs font-extrabold tracking-[.13em] text-violet-100 sm:text-sm">{resultLanguage==='bn'?'RAG থেকে পাওয়া নিরাপত্তা নির্দেশনা':'RETRIEVED SAFETY GUIDANCE'}</p><p className="mt-1 text-sm text-slate-300">{resultLanguage==='bn'?'SHONKET-এর সাজানো knowledge base থেকে':'From SHONKET AI’s curated knowledge base'}</p></div></div><span className="shrink-0 rounded-full border border-violet-300/30 bg-violet-300/[.08] px-3 py-1.5 text-[10px] font-extrabold tracking-wide text-violet-50">RAG KNOWLEDGE BASE</span></div>
<p className="mt-3 text-sm leading-6 text-slate-300">{resultLanguage==='bn'?'এগুলো স্থানীয় knowledge base থেকে পাওয়া আগে-সংরক্ষিত সাধারণ নিরাপত্তা-তথ্য; লাইভ ওয়েব সার্চের ফলাফল নয়।':'These are curated safety references retrieved from the local knowledge base, not live web-search results.'}</p>
<div className="mt-4 grid gap-3">{analysis.retrievedSources.map((source,i)=><a key={source.id||source.url||i} href={source.url} target="_blank" rel="noopener noreferrer" className="retrieved-source-card group flex min-w-0 items-stretch gap-3 rounded-xl border border-violet-200/20 bg-[#090e1d]/80 p-3.5 transition hover:border-violet-200/40 hover:bg-violet-300/[.045] sm:gap-4 sm:p-4">
<SourceBrand source={source}/><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold leading-6 text-slate-100 group-hover:text-violet-100 sm:text-base">{source.title}</span><span className="mt-1 block text-sm leading-6 text-slate-300">{source.summary}</span><span className="official-source-open-button retrieved-guidance-open-button" data-source-brand={getSourceBrand(source)?.key || "default"}><ExternalLink size={14}/>{resultLanguage==='bn'?'অফিসিয়াল উৎস দেখুন':'VIEW OFFICIAL SOURCE'}<ArrowUpRight size={14}/></span></span>
</a>)}</div>
<div className="mt-4 flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[.035] px-3.5 py-3"><Info size={15} className="mt-0.5 shrink-0 text-violet-200"/><p className="text-xs leading-6 text-slate-300">{resultLanguage==='bn'?'Retrieved source সাধারণ নিরাপত্তা-পরামর্শ; এটি নির্দিষ্ট প্রেরক, লিংক, চাকরি, বৃত্তি বা পুরস্কারের সত্যতা প্রমাণ করে না।':'Retrieved sources are general safety guidance. They do not verify this particular sender, link, job, scholarship, or prize.'}</p></div>
</section>}
</div>

</div>}</motion.div>}
{active==='links'&&<motion.div key="links" initial={{opacity:0,x:12}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-12}}><p className="text-xs font-bold tracking-[.16em] text-cyan-200">{t('URL STRUCTURE CHECK','URL-এর গঠন যাচাই')}</p><h3 className="mt-2 font-display text-xl font-bold">{t('Inspect a link','লিংক যাচাই করুন')} before opening it</h3><p className="mt-2 text-sm leading-6 text-slate-400">{t('Check domain clues and risky URL patterns. SHONKET AI never visits the submitted URL.','ডোমেইনের সংকেত ও ঝুঁকিপূর্ণ URL প্যাটার্ন পরীক্ষা করুন। SHONKET AI জমা দেওয়া লিংকে প্রবেশ করে না।')}</p><label htmlFor="url" className="mb-2 mt-6 block text-xs font-semibold text-slate-300">{t('Website address','ওয়েবসাইটের ঠিকানা')}</label><div className="flex gap-2 rounded-2xl border border-white/10 bg-[#090c19]/80 p-2"><input id="url" value={url} onChange={e=>{linkInspectionRequestRef.current+=1;linkOfficialSearchRef.current=null;setLinkBusy(false);setLinkAnalysis(null);setUrl(e.target.value);setUrlResult(null)}} onKeyDown={e=>e.key==='Enter'&&inspect()} placeholder={t('example.com or https://...','example.com অথবা https://...')} className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-slate-600"/><button onClick={inspect} disabled={!url.trim()} className="action-button action-cyan rounded-xl px-4 py-3 text-xs font-bold disabled:opacity-40">Inspect</button></div>{urlResult&&<div className="mt-5 space-y-4">{urlResult.error?<p className="rounded-xl border border-orange-300/25 bg-orange-300/[.07] p-3 text-sm text-orange-100">{urlResult.error}</p>:<><div className={`relative overflow-hidden rounded-xl border p-4 shadow-lg ${urlResult.linkCategory.toLowerCase().includes('adult')||urlResult.linkCategory.toLowerCase().includes('gambling')?'border-rose-400/60 bg-gradient-to-r from-rose-500/15 via-rose-400/[.08] to-transparent shadow-rose-950/30':'border-cyan-300/50 bg-gradient-to-r from-cyan-400/15 via-cyan-300/[.08] to-transparent shadow-cyan-950/30'}`}><div className="flex items-center justify-between gap-3"><p className={`text-[10px] font-extrabold tracking-[.16em] ${urlResult.linkCategory.toLowerCase().includes('adult')||urlResult.linkCategory.toLowerCase().includes('gambling')?'text-rose-200':'text-cyan-200'}`}>DESTINATION IDENTIFICATION</p><span className={`rounded-full border px-2 py-1 text-[9px] font-extrabold tracking-wider ${urlResult.categorySource.includes('Keyword hint')?'border-slate-400/30 bg-slate-400/10 text-slate-300':urlResult.categorySource.includes('Brand-name mismatch')?'border-amber-300/30 bg-amber-300/10 text-amber-100':urlResult.categoryMatched?'border-cyan-300/30 bg-cyan-300/10 text-cyan-100':'border-slate-400/30 bg-slate-400/10 text-slate-300'}`}>{urlResult.categorySource.includes('Keyword hint')?(isBn?'শব্দভিত্তিক ইঙ্গিত':'KEYWORD HINT'):urlResult.categorySource.includes('Brand-name mismatch')?(isBn?'ডোমেইনে অমিল':'DOMAIN MISMATCH'):urlResult.categoryMatched?(isBn?'স্থানীয় তালিকার মিল':'LOCAL REFERENCE'):(isBn?'অনিশ্চিত':'UNCONFIRMED')}</span></div><p className="mt-2 text-lg font-extrabold leading-snug text-white">{isBn?urlResult.linkCategoryBn:urlResult.linkCategory}</p><p className="mt-2 text-[11px] leading-5 text-slate-300">{urlResult.categorySource.includes('Brand-name mismatch')?(isBn?"Hostname-এ পরিচিত brand-এর নাম আছে, কিন্তু estimated base domain-টি brand-এর পরিচিত official domain family-এর সঙ্গে মেলে না। এটি একটি সতর্ক সংকেত; ক্ষতিকর কার্যকলাপের চূড়ান্ত প্রমাণ নয়।":"The hostname contains a known brand name, but the estimated base domain does not match that brand's known official domain family. This is a warning signal, not proof of malicious activity."):urlResult.categorySource.includes('Keyword hint')?(isBn?"এটি URL-এর শব্দ থেকে পাওয়া একটি সম্ভাব্য category hint; website-এর আসল content যাচাই করা হয়নি।":"This is only a keyword-based category hint. The website's actual content was not checked."):urlResult.categorySource.includes('Known domain')?(isBn?"এই label স্থানীয় reference list থেকে এসেছে; live website বা মালিকানা যাচাই করা হয়নি।":"This label comes from a small local reference list; the live website and its ownership were not verified."):urlResult.categoryMatched?(isBn?"ডোমেইনের নাম পরিচিত brand-এর official domain-এর সঙ্গে মেলে না।":"The domain name does not match the known brand's official domain."): (isBn?"URL দেখে নির্দিষ্ট website category নিশ্চিত করা যায়নি।":"The URL alone does not identify a specific website category.")} এটি website-এর আসল content যাচাই করে না।</p></div><div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1020]"><div className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between border-white/[.07] px-4 py-3"><div className="min-w-0"><p className="text-[10px] font-bold tracking-[.15em] text-cyan-200">SCAN RESULT</p><p className="mt-1 break-words text-sm font-bold text-white [overflow-wrap:anywhere]">{urlResult.host}</p><p className="mt-1 text-[11px] text-slate-500">Estimated base domain: {urlResult.rootDomain}</p></div><div className="w-full text-left sm:w-auto sm:text-right"><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${urlResult.riskLevel==='high'?'bg-red-400/15 text-red-200':urlResult.riskLevel==='medium'?'bg-amber-300/15 text-amber-100':urlResult.riskLevel==='low'?'bg-cyan-300/15 text-cyan-100':'bg-slate-400/10 text-slate-300'}`}>{urlResult.riskLevel==='high'?'HIGH URL WARNING SCORE':urlResult.riskLevel==='medium'?'MEDIUM URL WARNING SCORE':urlResult.riskLevel==='low'?'LOW URL WARNING SCORE':'NO URL FLAGS DETECTED'}</span><p className="mt-2 text-2xl font-extrabold tabular-nums text-white">{urlResult.riskScore}<span className="text-xs font-semibold text-slate-500">/100</span></p><p className="text-[10px] text-slate-500">Heuristic URL points · not probability</p></div></div><div className="px-4 py-3"><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${urlResult.riskLevel==='high'?'bg-red-400':urlResult.riskLevel==='medium'?'bg-amber-300':urlResult.riskLevel==='low'?'bg-cyan-300':'bg-slate-400'}`} style={{width:urlResult.riskScore+'%'}}/></div><p className="mt-2 text-[11px] leading-5 text-slate-400">{urlResult.signals.length?urlResult.signals.length+' warning pattern'+(urlResult.signals.length===1?'':'s')+' found in this address. These are clues, not proof that the website is malicious.':'No supported URL-pattern warning indicators were detected. This is not a website safety rating or reputation check.'}</p></div></div><section className="link-detail-card link-detail-card-warning rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="link-detail-card-header mb-3 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-300/10 text-amber-200"><AlertTriangle size={15}/></span><div><h4 className="link-detail-card-title text-sm font-bold text-white">What we noticed</h4><p className="link-detail-card-caption text-[11px] text-slate-500">The clues found in this URL</p></div></div>{urlResult.signals.length?<div className="space-y-2">{urlResult.signals.map((s,i)=><div key={s.id} className="link-detail-signal rounded-xl border border-amber-200/15 bg-amber-200/[.045] p-3"><div className="flex items-start gap-2"><span className="link-detail-signal-number grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-200/15 text-[10px] font-extrabold text-amber-100">{i+1}</span><div className="link-detail-signal-content min-w-0"><p className="link-detail-signal-title text-xs font-bold text-amber-100">{s.label}</p><p className="link-detail-signal-copy mt-1 text-xs leading-5 text-slate-300">{s.detail}</p></div></div></div>)}</div>:<p className="text-xs leading-5 text-slate-400">No supported URL-pattern warning indicators were detected. The site's content and reputation have not been checked.</p>}</section><section className="link-detail-card link-detail-card-guidance rounded-2xl border border-emerald-300/15 bg-emerald-300/[.035] p-4"><div className="link-detail-card-header mb-2 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-300/10 text-emerald-200"><ShieldCheck size={15}/></span><h4 className="link-detail-card-title text-sm font-bold text-white">What you should do</h4></div><ul className="link-detail-guidance-list space-y-2 text-xs leading-5 text-slate-300">{urlResult.signals.some(s=>['phishing','identity','brand'].includes(s.id))&&<li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300"/>Do not enter passwords, OTPs, PINs or personal details.</li>}{urlResult.signals.some(s=>['financial','investment','subscription'].includes(s.id))&&<li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300"/>Do not pay or add card details until you verify the organisation independently.</li>}{urlResult.signals.some(s=>['adult_bait','download'].includes(s.id))&&<li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300"/>Avoid unknown downloads, pop-ups and requests to install apps.</li>}{urlResult.signals.some(s=>['shortener','userinfo','punycode','ip','port','deep'].includes(s.id))&&<li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300"/>Check the exact registered domain through a trusted source you find yourself.</li>}{!urlResult.signals.length&&<li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300"/>If you were not expecting this link, do not open it. Confirm with the sender using another trusted channel.</li>}<li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300"/>If unsure, close the message and verify using the service's official app or website.</li></ul></section><section className="link-detail-card link-detail-card-technical rounded-2xl border border-white/10 bg-white/[.02] p-4"><h4 className="link-detail-card-title mb-2 text-xs font-bold text-white">Technical checks</h4>{urlResult.checks.map(c=><div key={c.label} className="link-detail-check-row flex gap-3 border-t border-white/[.06] py-2.5"><span className={c.ok?'text-emerald-300':'text-amber-300'}>{c.ok?<CheckCircle2 size={15}/>:<AlertTriangle size={15}/>}</span><div className="link-detail-check-content"><p className="link-detail-check-title text-xs font-semibold text-slate-200">{c.label}</p><p className="link-detail-check-note mt-1 text-[11px] leading-4 text-slate-500">{c.note}</p></div></div>)}</section><div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.04] p-3"><p className="text-[10px] font-bold tracking-wide text-cyan-100">PLEASE NOTE</p><p className="mt-1 text-xs leading-5 text-slate-400">This score covers only URL wording and structure. It does not check site content, reputation, malware, ownership, or redirects. A score of 0 means no supported URL-pattern indicator was detected — not that the website is safe.</p></div></>}</div>}{linkAnalysis&&<div className="link-intelligence-panel mt-5 space-y-3" data-testid="link-analysis-evidence" aria-live="polite">
<section className="rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-300/[.07] via-[#0b1020] to-violet-300/[.05] p-4">
<div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-extrabold tracking-[.16em] text-cyan-100">LINK INTELLIGENCE</p><h4 className="mt-1 text-sm font-extrabold text-white">{t('Local URL analysis','স্থানীয় URL বিশ্লেষণ')}</h4></div><span className="rounded-full border border-cyan-200/20 bg-cyan-200/[.07] px-2.5 py-1 text-[9px] font-extrabold tracking-wide text-cyan-100">{linkBusy?t('ANALYSIS RUNNING','বিশ্লেষণ চলছে'):linkAnalysis.aiAnalysis?.status==='ready'?'AI-ASSISTED EXPLANATION READY':linkAnalysis.aiAnalysis?.status==='not_configured'?'LOCAL URL CHECKS ONLY':'ANALYSIS COMPLETE'}</span></div>
<p className="mt-2 text-[11px] leading-5 text-slate-400">{t('The URL pattern score is calculated locally and independently of the live web results below. Web Evidence may find public references, but it does not verify site reputation, ownership, malware, page content or safety.','URL pattern score স্থানীয়ভাবে হিসাব করা হয় এবং নিচের live web results থেকে আলাদা। Web Evidence public reference খুঁজতে পারে, কিন্তু site reputation, ownership, malware, page content বা safety নিশ্চিত করে না।')}</p>
</section>
{<section className="rounded-2xl border border-cyan-300/20 bg-[#0b1020]/90 p-4" data-testid="domain-web-evidence">
<div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Globe2 size={17} className="text-cyan-200"/><p className="text-[10px] font-extrabold tracking-[.14em] text-cyan-100">{t('LIVE WEB SEARCH · DOMAIN EVIDENCE','লাইভ ওয়েব সার্চ · ডোমেইন তথ্য')}</p></div><span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold ${['results_found','partial_results'].includes(linkAnalysis.webEvidence?.status)?'border-emerald-300/25 bg-emerald-300/[.07] text-emerald-100':linkAnalysis.webEvidence?.status==='pending'?'border-cyan-300/25 bg-cyan-300/[.07] text-cyan-100':'border-amber-200/20 bg-amber-200/[.05] text-amber-100'}`}>{linkAnalysis.webEvidence?.status==='pending'?t('SEARCHING','অনুসন্ধান চলছে'):linkAnalysis.webEvidence?.status==='results_found'?t('RESULTS FOUND','ফলাফল পাওয়া গেছে'):linkAnalysis.webEvidence?.status==='partial_results'?t('PARTIAL RESULTS','আংশিক ফলাফল'):linkAnalysis.webEvidence?.status==='no_results'?t('NO RELEVANT MATCHES','প্রাসঙ্গিক ফল নেই'):linkAnalysis.webEvidence?.status==='rate_limited'?t('RATE LIMITED','সার্চ সীমা পূর্ণ'):linkAnalysis.webEvidence?.status==='not_configured'?t('NOT CONFIGURED','সংযুক্ত নয়'):linkAnalysis.webEvidence?.status==='restricted_category'?t('NOT SEARCHED','সার্চ করা হয়নি'):linkAnalysis.webEvidence?.status==='unavailable'?t('SEARCH UNAVAILABLE','সার্চ পাওয়া যাচ্ছে না'):String(linkAnalysis.webEvidence?.status||'pending').replace(/_/g,' ').toUpperCase()}</span></div>
<p className="mt-2 break-all text-xs font-semibold text-slate-200">{linkAnalysis.webEvidence?.domain||urlResult.rootDomain}</p>
<p className="mt-2 text-xs leading-5 text-slate-300">{analysisLanguage==='bn'?(linkAnalysis.webEvidence?.summary_bn||'ডোমেইন-সম্পর্কিত ওয়েব ফলাফল খোঁজা হচ্ছে।'):(linkAnalysis.webEvidence?.summary_en||'Searching for domain-related web references.')}</p>
{linkAnalysis.webEvidence?.threatIntelligence&&<section className="mt-3 rounded-xl border border-violet-300/20 bg-violet-300/[.035] p-3" data-testid="threat-intelligence-results">
  <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="flex items-center gap-2"><ShieldCheck size={15} className="text-violet-200"/><p className="text-[10px] font-extrabold tracking-[.14em] text-violet-100">{t('URLHAUS THREAT INTELLIGENCE','URLhaus থ্রেট ইন্টেলিজেন্স')}</p></div>
    <span className="rounded-full border border-violet-200/20 bg-violet-200/[.06] px-2.5 py-1 text-[9px] font-extrabold text-violet-100">{linkAnalysis.webEvidence.threatIntelligence.status==='not_configured'?t('API KEY NEEDED','API KEY প্রয়োজন'):linkAnalysis.webEvidence.threatIntelligence.status==='active_records_found'?t('ACTIVE URL RECORDS','সক্রিয় URL রেকর্ড'):linkAnalysis.webEvidence.threatIntelligence.status==='historical_records'?t('HISTORICAL RECORDS','পুরোনো রেকর্ড'):linkAnalysis.webEvidence.threatIntelligence.status==='records_found'?t('URL RECORDS FOUND','URL রেকর্ড পাওয়া গেছে'):linkAnalysis.webEvidence.threatIntelligence.status==='no_matches'?t('NO RECORDS FOUND','কোনো রেকর্ড মেলেনি'):t('LOOKUP UNAVAILABLE','অনুসন্ধান পাওয়া যায়নি')}</span>
  </div>
  <p className="mt-2 text-[11px] leading-5 text-slate-300">{analysisLanguage==='bn'?linkAnalysis.webEvidence.threatIntelligence.summary_bn:linkAnalysis.webEvidence.threatIntelligence.summary_en}</p>
  <div className="mt-3 grid gap-2">
    {linkAnalysis.webEvidence.threatIntelligence.providers?.map(provider=><div key={provider.name} className="rounded-lg border border-white/10 bg-[#080d1a]/65 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-extrabold text-white">{provider.name}</p>
        <span className={`rounded-full border px-2 py-1 text-[9px] font-extrabold ${provider.status==='active_records_found'?'border-amber-300/25 bg-amber-300/10 text-amber-100':provider.status==='historical_records'?'border-yellow-200/20 bg-yellow-200/[.06] text-yellow-100':provider.status==='records_found'?'border-sky-200/20 bg-sky-200/[.06] text-sky-100':provider.status==='no_match'?'border-slate-400/20 bg-slate-400/[.07] text-slate-300':provider.status==='not_configured'?'border-violet-300/20 bg-violet-300/[.06] text-violet-100':'border-amber-200/20 bg-amber-200/[.05] text-amber-100'}`}>{provider.status==='active_records_found'?t('ACTIVE URL RECORDS','সক্রিয় URL রেকর্ড'):provider.status==='historical_records'?t('HISTORICAL RECORDS','পুরোনো রেকর্ড'):provider.status==='records_found'?t('URL RECORDS FOUND','URL রেকর্ড পাওয়া গেছে'):provider.status==='no_match'?t('NO MATCH','মেলেনি'):provider.status==='not_configured'?t('NOT CONFIGURED','সংযুক্ত নয়'):t('UNAVAILABLE / PARTIAL','পাওয়া যায়নি / আংশিক')}</span>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-slate-300">{analysisLanguage==='bn'?provider.summary_bn:provider.summary_en}</p>
      {provider.targets?.filter(target=>target.status!=='no_match').map(target=><div key={target.host} className="mt-2 rounded-lg border border-white/[.07] bg-white/[.025] p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="break-all text-[10px] font-bold text-slate-200">{target.host}</span>
          <span className="text-[9px] font-extrabold text-amber-100">{target.status==='active_malware_urls'?t('ACTIVE MALWARE URLS','সক্রিয় ম্যালওয়্যার URL'):target.status==='historical_records'?t('HISTORICAL / OFFLINE URLS','পুরোনো / অফলাইন URL'):target.status==='records_found'?t('URL RECORDS FOUND','URL রেকর্ড পাওয়া গেছে'):t('LOOKUP UNAVAILABLE','অনুসন্ধান পাওয়া যায়নি')}</span>
        </div>
        <p className="mt-1 text-[10px] leading-4 text-slate-400">{analysisLanguage==='bn'?target.summary_bn:target.summary_en}</p>
        {target.sourceUrl&&<a href={target.sourceUrl} target="_blank" rel="noopener noreferrer" className="official-source-open-button retrieved-guidance-open-button mt-2"><ExternalLink size={13}/>{t('OPEN PROVIDER REPORT','প্রোভাইডার রিপোর্ট খুলুন')}<ArrowUpRight size={13}/></a>}
      </div>)}
    </div>)}
  </div>
  <p className="mt-3 border-t border-white/[.07] pt-2 text-[10px] leading-5 text-slate-500">{t('Privacy: provider checks use hostnames only; submitted paths, query strings and credentials are not sent. A host-level record can refer to a specific URL path or a past compromise; it does not classify the entire domain. Offline records are not currently marked online, and a database miss is not proof of safety.','গোপনীয়তা: provider check-এ শুধু hostname পাঠানো হয়; submitted path, query string ও credentials পাঠানো হয় না। Host-level record নির্দিষ্ট URL path বা অতীতের compromise-এর হতে পারে; এটি পুরো domain-কে ক্ষতিকর বলে না। Offline record বর্তমানে online হিসেবে চিহ্নিত নয়, আর database-এ record না থাকা নিরাপদ হওয়ার প্রমাণ নয়।')}</p>
</section>}
{linkAnalysis.webEvidence?.status==='pending'&&<div className="official-search-pending mt-3" role="status"><span className="official-search-spinner"/><span className="text-xs text-slate-300">{t('Searching the web for domain mentions, identity and security reports…','ডোমেইনের উল্লেখ, পরিচয় ও নিরাপত্তা রিপোর্ট খোঁজা হচ্ছে…')}</span></div>}
{linkAnalysis.webEvidence?.sources?.length>0&&<div className="mt-3 grid gap-2.5">{linkAnalysis.webEvidence.sources.map((source,i)=><a key={source.url||i} href={source.url} target="_blank" rel="noopener noreferrer" className="web-evidence-source domain-search-result-card group flex min-w-0 items-start gap-3 rounded-xl p-3"><span className="domain-search-result-logo shrink-0"><LiveSourceLogo source={source} compact/></span><span className="min-w-0 flex-1"><span className="domain-search-result-meta"><span className="domain-search-result-type">{analysisLanguage==='bn'?(source.evidenceLabel_bn||'সম্পর্কিত ওয়েব রেফারেন্স'):(source.evidenceLabel_en||'RELATED WEB REFERENCE')}</span><span className="domain-search-result-domain">{source.domain||getLiveSourceDomain(source)||source.url}</span></span><span className="mt-2 block text-xs font-extrabold leading-5 text-slate-100 group-hover:text-cyan-100">{source.title}</span>{source.snippet&&<span className="mt-1.5 block text-[11px] leading-5 text-slate-300">{source.snippet}</span>}{(source.userBenefit_en||source.userBenefit_bn)&&<span className="domain-search-result-benefit"><strong>{t('Why this helps','এটি যেভাবে কাজে লাগবে')}</strong>{analysisLanguage==='bn'?(source.userBenefit_bn||source.userBenefit_en):(source.userBenefit_en||source.userBenefit_bn)}</span>}<span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-cyan-100">{t('OPEN ORIGINAL RESULT','মূল ওয়েবসাইটের ফল খুলুন')} <ExternalLink size={12}/></span></span></a>)}</div>}
{linkAnalysis.webEvidence?.status!=='pending'&&(!linkAnalysis.webEvidence?.sources||linkAnalysis.webEvidence.sources.length===0)&&<p className="mt-3 rounded-xl border border-white/10 bg-white/[.025] p-3 text-xs text-slate-400">{linkAnalysis.webEvidence?.status==='restricted_category'?t('Search results are not surfaced for this age-restricted category.','এই বয়স-সীমাবদ্ধ ক্যাটাগরির সার্চ ফলাফল দেখানো হয় না।'):t('No relevant source cards are available. This is not a clean bill of health; review the URL warnings and verify the owner independently.','প্রাসঙ্গিক কোনো উৎস পাওয়া যায়নি। এটিকে নিরাপদ হওয়ার প্রমাণ ভাববেন না; URL সতর্কতা দেখুন এবং মালিকানা আলাদাভাবে যাচাই করুন।')}</p>}
<p className="mt-3 border-t border-white/[.07] pt-3 text-[10px] leading-5 text-slate-500">{t('Search engine: ','সার্চ ইঞ্জিন: ')}{linkAnalysis.webEvidence?.provider||'DuckDuckGo'} · {t('Queries completed: ','সম্পন্ন query: ')}{linkAnalysis.webEvidence?.successfulQueryCount??0}/{linkAnalysis.webEvidence?.queryCount??0}. {t('Search snippets are not proof of site safety or maliciousness.','সার্চ snippet সাইট নিরাপদ বা ক্ষতিকর হওয়ার প্রমাণ নয়।')}</p>
</section>}
{linkAnalysis.officialSearch&&linkAnalysis.officialSearch.status!=='not_applicable'&&<section className="official-source-search-panel rounded-2xl border border-white/10 bg-[#080e1d]/75 p-4">
<div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><ShieldCheck size={17} className="text-cyan-200"/><p className="text-[10px] font-extrabold tracking-[.14em] text-white">{t('LIVE OFFICIAL-SOURCE SEARCH','লাইভ সরকারি উৎস অনুসন্ধান')}</p></div><span className="rounded-full border border-cyan-300/20 bg-cyan-300/[.07] px-2.5 py-1 text-[9px] font-extrabold text-cyan-100">{linkAnalysis.officialSearch.status==='pending'?t('SEARCHING','অনুসন্ধান চলছে'):String(linkAnalysis.officialSearch.status).replace(/_/g,' ').toUpperCase()}</span></div>
<p className="mt-2 text-xs leading-6 text-slate-300">{analysisLanguage==='bn'?linkAnalysis.officialSearch.summary_bn:linkAnalysis.officialSearch.summary_en}</p>
{linkAnalysis.officialSearch.sources?.length>0&&<div className="mt-3 grid gap-2">{linkAnalysis.officialSearch.sources.map((source,i)=><a key={source.id||source.url||i} href={source.url} target="_blank" rel="noopener noreferrer" className="official-search-result-card rounded-xl border border-white/10 bg-white/[.025] p-3 transition hover:border-cyan-200/30"><p className="text-xs font-bold text-white">{source.title}</p><p className="mt-1 text-[10px] text-slate-400">{source.agency||source.url}</p>{source.excerpt&&<p className="mt-2 text-[11px] leading-5 text-slate-400">{source.excerpt}</p>}<span className="official-source-open-button link-inspector-source-cta" data-source-brand={getSourceBrand(source)?.key || "default"}><ExternalLink size={14}/>{t('OPEN ORIGINAL SOURCE','মূল উৎস খুলুন')}<ArrowUpRight size={14}/></span></a>)}</div>}
{linkAnalysis.officialSearch.status==='pending'&&<div className="official-search-pending mt-3" role="status"><span className="official-search-spinner"/><p className="text-xs text-slate-300">{t('Checking selected official portals…','নির্বাচিত সরকারি পোর্টাল পরীক্ষা করা হচ্ছে…')}</p></div>}
{linkAnalysis.officialSearch.searchedPortals?.length>0&&<p className="mt-3 border-t border-white/10 pt-3 text-[10px] leading-5 text-slate-500">{t('Searched sources: ','অনুসন্ধান করা উৎস: ')}{linkAnalysis.officialSearch.searchedPortals.map(source=>source.agency).filter(Boolean).join(' · ')}</p>}
</section>}
{linkAnalysis.claimVerification?.status&&linkAnalysis.claimVerification.status!=='not_applicable'&&<section className="claim-verification-panel rounded-2xl border border-amber-200/20 bg-amber-100/[.035] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-extrabold tracking-[.14em] text-amber-100">{t('EVIDENCE STATUS','প্রমাণের অবস্থা')}</p><span className="rounded-full border border-amber-200/20 bg-amber-200/[.07] px-2.5 py-1 text-[9px] font-extrabold text-amber-100">{String(linkAnalysis.claimVerification.status).replace(/_/g,' ').toUpperCase()}</span></div><p className="mt-2 text-xs leading-6 text-slate-300">{analysisLanguage==='bn'?linkAnalysis.claimVerification.summary_bn:linkAnalysis.claimVerification.summary_en}</p></section>}
{linkAnalysis.retrievedSources?.length>0&&<section className="retrieved-guidance-panel rounded-2xl border border-violet-200/20 bg-violet-200/[.035] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><FileText size={16} className="text-violet-200"/><p className="text-[10px] font-extrabold tracking-[.14em] text-violet-100">{t('RETRIEVED SAFETY GUIDANCE','সংগৃহীত নিরাপত্তা নির্দেশনা')}</p></div><span className="rounded-full border border-violet-200/20 px-2.5 py-1 text-[9px] font-bold text-violet-100">{t('RAG KNOWLEDGE BASE','RAG জ্ঞানভান্ডার')}</span></div><p className="mt-2 text-[10px] leading-5 text-slate-500">{t('Curated safety references retrieved by matching the domain context and warning patterns.','ডোমেইন-প্রেক্ষাপট ও সতর্কতার ধরন মিলিয়ে curated safety reference আনা হয়েছে।')}</p><div className="mt-3 grid gap-2.5">{linkAnalysis.retrievedSources.map((source,i)=><div key={source.id||i} className="retrieved-source-card rounded-xl border border-white/10 bg-black/10 p-3"><p className="text-xs font-bold text-slate-100">{source.title}</p><p className="mt-1.5 text-[11px] leading-5 text-slate-300">{source.summary}</p><a href={source.url} target="_blank" rel="noopener noreferrer" className="official-source-open-button retrieved-guidance-open-button mt-3" data-source-brand={getSourceBrand(source)?.key || "default"}><ExternalLink size={14}/>{t('OPEN REFERENCE','রেফারেন্স খুলুন')}<ArrowUpRight size={14}/></a></div>)}</div></section>}
{linkAnalysis.aiAnalysis&&<section className="ai-explanation-panel rounded-2xl border border-violet-300/25 bg-violet-300/[.045] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-extrabold tracking-[.15em] text-violet-100">{t('AI EXPLANATION','AI ব্যাখ্যা')}</p><span className="rounded-full border border-violet-300/20 bg-violet-300/[.07] px-2 py-1 text-[9px] font-bold text-violet-100">{linkAnalysis.aiAnalysis.status==='ready'?'LLM ACTIVE':linkAnalysis.aiAnalysis.status==='pending'?'AI PENDING':linkAnalysis.aiAnalysis.status==='unavailable'?'LLM UNAVAILABLE':'LOCAL GUIDANCE ONLY'}</span></div>{linkAnalysis.aiAnalysis.status==='ready'?<><p className="mt-3 text-xs leading-6 text-slate-200">{analysisLanguage==='bn'?linkAnalysis.aiAnalysis.explanation_bn:linkAnalysis.aiAnalysis.explanation_en}</p>{(analysisLanguage==='bn'?linkAnalysis.aiAnalysis.next_steps_bn:linkAnalysis.aiAnalysis.next_steps_en)?.length>0&&<ul className="mt-3 space-y-2">{(analysisLanguage==='bn'?linkAnalysis.aiAnalysis.next_steps_bn:linkAnalysis.aiAnalysis.next_steps_en).map((step,i)=><li key={i} className="flex gap-2 text-xs leading-5 text-slate-300"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-violet-200"/>{step}</li>)}</ul>}</>:<p className="mt-3 text-xs leading-5 text-slate-300">{analysisLanguage==='bn'?linkAnalysis.aiAnalysis.note_bn:linkAnalysis.aiAnalysis.note_en}</p>}</section>}
<section className="limitations-card" aria-label={t('Limitations and uncertainty','সীমাবদ্ধতা ও অনিশ্চয়তা')}><h4 className="limitations-heading">{t('LIMITATIONS & UNCERTAINTY','সীমাবদ্ধতা ও অনিশ্চয়তা')}</h4><p className="limitations-body">{t('The full page, final redirect, domain owner and malware status were not independently checked. AI and RAG provide context only; local URL pattern checks remain the displayed score.','সম্পূর্ণ ওয়েবপেজ, চূড়ান্ত redirect, domain owner বা malware অবস্থা স্বাধীনভাবে পরীক্ষা করা হয়নি। AI ও RAG শুধু প্রেক্ষাপট দেয়; দেখানো score স্থানীয় URL pattern check-এর।')}</p></section>
</div>}<p className="mt-4 text-[11px] leading-5 text-slate-500">A clean-looking URL is not proof that a site is trustworthy. Never enter passwords or payment details on an unverified site.</p></motion.div>}
{active==='history'&&<motion.div key="history" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}}>
<div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-extrabold tracking-[.16em] text-cyan-200">{t('YOUR ACTIVITY','আপনার কার্যক্রম')}</p><h3 className="mt-2 font-display text-2xl font-extrabold text-white">{t('Recent history','সাম্প্রতিক ইতিহাস')}</h3><p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">{t('Your recent checks and practice sessions, saved only in this browser. Message text is not stored.','আপনার সাম্প্রতিক যাচাই ও অনুশীলনের তথ্য শুধু এই ব্রাউজারে সংরক্ষিত থাকে। বার্তার লেখা সংরক্ষণ করা হয় না।')}</p></div><div className="flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] px-3 py-2 text-xs text-cyan-100"><History size={15}/>{historyRecords.length} {t('saved activities','টি সংরক্ষিত কার্যক্রম')}</div></div>
{historyRecords.length===0?<div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[.025] p-8 text-center"><Clock3 size={28} className="mx-auto text-slate-500"/><h4 className="mt-3 text-sm font-bold text-white">{t('No activity yet','এখনো কোনো কার্যক্রম নেই')}</h4><p className="mt-1 text-xs text-slate-500">{t('Your completed checks and training sessions will appear here.','আপনার যাচাই ও প্রশিক্ষণ শেষ হলে এখানে দেখা যাবে।')}</p><button onClick={()=>go('checker')} className="action-button action-violet mt-5 rounded-full px-4 py-2.5 text-xs font-bold">{t('Start a check','যাচাই শুরু করুন')}</button></div>:<><div className="mt-6 space-y-3">{historyRecords.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b1020] p-4"><div className="flex min-w-0 items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-300/20 bg-violet-300/[.08] text-violet-200">{item.type==='Awareness Training'?<Trophy size={18}/>:item.type==='Link Inspector'?<Link2 size={18}/>:<ScanSearch size={18}/>}</div><div className="min-w-0"><p className="text-xs font-bold text-white">{item.title}</p><p className="mt-1 text-[11px] text-slate-500">{item.type} · {new Date(item.createdAt).toLocaleString()}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">{item.verdict?.replace(/_/g,' ')||'Completed'}{item.riskLevel&&item.riskLevel!=='unknown'?' · '+item.riskLevel+' risk':''}</p></div></div><div className="text-right">{item.score!==undefined?<><p className="text-xl font-extrabold text-white">{item.score}<span className="text-xs text-slate-500">/{item.total}</span></p><p className="text-[10px] text-slate-500">Practice score</p></>:item.riskScore!==null&&item.riskScore!==undefined?<><p className="text-xl font-extrabold text-white">{item.riskScore}<span className="text-xs text-slate-500">/100</span></p><p className="text-[10px] text-slate-500">Risk score</p></>:<p className="text-xs text-slate-500">No score</p>}</div></div>)}</div><div className="mt-4 flex justify-end"><button onClick={()=>{if(window.confirm(t('Clear all locally saved history?','এই ব্রাউজারে সংরক্ষিত সব ইতিহাস মুছে ফেলবেন?')))setHistoryRecords([])}} className="inline-flex items-center gap-2 rounded-xl border border-rose-300/20 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-300/[.06]"><Trash2 size={14}/>{t('Clear history','ইতিহাস মুছুন')}</button></div></>}
</motion.div>}
{active==='simulator'&&<motion.div key="simulator" initial={{opacity:0,x:12}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-12}}>{simFinished?<div className="py-5 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-300/10 text-emerald-200"><ShieldCheck size={30}/></div><p className="mt-5 text-[10px] font-extrabold tracking-[.2em] text-emerald-200">{t('TRAINING COMPLETE','প্রশিক্ষণ সম্পন্ন')}</p><h3 className="mt-2 font-display text-2xl font-extrabold text-white">{t('Your awareness score','আপনার সচেতনতার স্কোর')}</h3><p className="mt-3 text-5xl font-black text-white">{simScore}<span className="text-2xl text-slate-500">/{scenarios.length}</span></p><p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">{simScore===scenarios.length?t('Excellent work. You consistently chose safer actions. Keep verifying unexpected requests.','দারুণ! প্রতিটি পরিস্থিতিতে নিরাপদ সিদ্ধান্ত নিয়েছেন। অপ্রত্যাশিত অনুরোধ সবসময় যাচাই করুন।'):simScore>=3?t('Good progress. Review the explanations and practise again to strengthen your instincts.','ভালো অগ্রগতি। ব্যাখ্যাগুলো দেখে আবার অনুশীলন করলে সচেতনতা আরও বাড়বে।'):t('Keep practising. Review each explanation and remember: pause, verify, then act.','আরও অনুশীলন করুন। প্রতিটি ব্যাখ্যা পড়ুন—থামুন, যাচাই করুন, তারপর সিদ্ধান্ত নিন।')}</p><div className="mx-auto mt-6 max-w-sm rounded-xl border border-white/10 bg-white/[.03] p-4 text-left"><p className="text-xs font-bold text-white">{t('Remember these three rules','এই তিনটি নিয়ম মনে রাখুন')}</p><ul className="mt-3 space-y-2 text-xs leading-5 text-slate-400"><li>• {t('Never share OTPs, PINs or passwords.','কখনো OTP, PIN বা পাসওয়ার্ড শেয়ার করবেন না।')}</li><li>• {t('Verify requests using an official channel you find yourself.','নিজে খুঁজে পাওয়া অফিসিয়াল চ্যানেলে অনুরোধ যাচাই করুন।')}</li><li>• {t('Do not pay unexpected fees or rush under pressure.','অপ্রত্যাশিত ফি দেবেন না বা চাপে তাড়াহুড়ো করবেন না।')}</li></ul></div><button onClick={resetSimulator} className="action-button action-violet mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-bold">{t('Practise again','আবার অনুশীলন করুন')} <ArrowRight size={14}/></button></div>:<><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-extrabold tracking-[.16em] text-violet-200">{t('AWARENESS TRAINING','সচেতনতা প্রশিক্ষণ')}</p><p className="mt-1 text-[11px] text-slate-500">{t('Make a choice. Learn the signal. Build safer habits.','সিদ্ধান্ত নিন, সংকেত বুঝুন, নিরাপদ অভ্যাস গড়ুন।')}</p></div><div className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-right"><p className="text-[10px] font-bold tracking-wider text-slate-500">{t('CORRECT ANSWERS','সঠিক উত্তর')}</p><p className="text-sm font-extrabold text-white">{simScore}<span className="text-slate-500">/{scenarios.length}</span></p></div></div><div className="mt-5 flex items-center justify-between text-[10px] font-bold tracking-wider text-slate-500"><span>{t('SCENARIO','পরিস্থিতি')} {scenario+1} {t('OF','এর মধ্যে')} {scenarios.length}</span><span>{Math.round((simDone.length/scenarios.length)*100)}% {t('COMPLETED','সম্পন্ন')}</span></div><div className="mt-2 flex gap-1.5">{scenarios.map((item,i)=><div key={item.tag} className={`h-1.5 flex-1 rounded-full ${simDone.includes(i)?'bg-emerald-300':i===scenario?'bg-violet-300':'bg-white/10'}`}/>)}</div><div className="relative mt-6 overflow-hidden rounded-2xl border border-violet-300/20 bg-gradient-to-br from-violet-400/[.12] via-[#11162a] to-cyan-300/[.06] p-5"><div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-400/10 blur-3xl"/><div className="relative flex items-center justify-between gap-3"><span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-2.5 py-1 text-[9px] font-extrabold tracking-[.15em] text-violet-100">{isBn?scenarioBn[scenario].tag:scenarios[scenario].tag}</span><span className="text-[10px] font-semibold text-slate-500">{t('FICTIONAL PRACTICE','কাল্পনিক অনুশীলন')}</span></div><h3 className="relative mt-4 font-display text-xl font-extrabold leading-snug text-white">{isBn?scenarioBn[scenario].title:scenarios[scenario].title}</h3><p className="relative mt-2 text-sm leading-6 text-slate-300">{isBn?scenarioBn[scenario].detail:scenarios[scenario].detail}</p><div className="relative mt-4 flex items-center gap-2 text-[10px] font-semibold text-amber-200"><AlertTriangle size={13}/>{t('Pause before responding to unexpected requests.','অপ্রত্যাশিত অনুরোধে সাড়া দেওয়ার আগে থামুন।')}</div></div><div className="mb-3 mt-5 flex items-center justify-between"><p className="text-xs font-bold text-slate-200">{t('What would you do?','আপনি কী করবেন?')}</p><span className="text-[10px] text-slate-500">{t('Choose one response','একটি উত্তর বেছে নিন')}</span></div><div className="space-y-2">{(isBn?scenarioBn[scenario].choices:scenarios[scenario].choices).map((c,i)=><button key={c} type="button" aria-pressed={choice===i} disabled={choice!==null} onClick={()=>chooseScenario(i)} className={`choice-button group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-xs transition-all ${choice===i?(i===scenarios[scenario].correct?'border-emerald-300/50 bg-emerald-300/10 text-emerald-100 shadow-[0_0_20px_rgba(52,211,153,.08)]':'border-rose-300/50 bg-rose-300/10 text-rose-100'):'border-white/10 bg-white/[.025] text-slate-300 hover:border-violet-300/40 hover:bg-violet-300/[.06]'} ${choice!==null&&i===scenarios[scenario].correct?'border-emerald-300/50 bg-emerald-300/10 text-emerald-100':''}`}><span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/20 text-[10px] font-extrabold text-slate-400">{String.fromCharCode(65+i)}</span><span className="flex-1 leading-5">{c}</span>{choice!==null&&i===scenarios[scenario].correct?<CheckCircle2 size={16} className="shrink-0 text-emerald-300"/>:choice===i?<AlertTriangle size={16} className="shrink-0 text-rose-300"/>:<span className="text-slate-600">↗</span>}</button>)}</div>{choice!==null&&<motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className={`mt-4 rounded-xl border p-4 ${choice===scenarios[scenario].correct?'border-emerald-300/25 bg-emerald-300/[.06]':'border-amber-300/25 bg-amber-300/[.05]'}`}><div className="flex items-center gap-2">{choice===scenarios[scenario].correct?<CheckCircle2 size={16} className="text-emerald-300"/>:<AlertTriangle size={16} className="text-amber-300"/>}<p className="text-xs font-extrabold text-white">{choice===scenarios[scenario].correct?t('Strong choice','নিরাপদ সিদ্ধান্ত'):t('Think it through','আরও সতর্ক হওয়া দরকার')}</p></div><p className="mt-2 text-xs leading-5 text-slate-300">{isBn?scenarioBn[scenario].explain:scenarios[scenario].explain}</p><div className="mt-3 rounded-lg bg-black/20 p-3"><p className="text-[10px] font-extrabold tracking-wider text-cyan-200">{t('SAFER RESPONSE','নিরাপদ পদক্ষেপ')}</p><p className="mt-1 text-xs leading-5 text-slate-300">{isBn?scenarioBn[scenario].choices[scenarios[scenario].correct]:scenarios[scenario].choices[scenarios[scenario].correct]}</p></div>{(isBn?scenarioBn[scenario].realSteps:scenarios[scenario].realSteps)&&<div className="mt-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[.04] p-3"><p className="text-[10px] font-extrabold tracking-wider text-cyan-200">{t('REAL-LIFE ACTION PLAN','বাস্তবে করণীয়')}</p><ul className="mt-2 space-y-2 text-xs leading-5 text-slate-300">{(isBn?scenarioBn[scenario].realSteps:scenarios[scenario].realSteps).map((step,i)=><li key={i} className="flex gap-2"><span className="font-bold text-cyan-200">{i+1}.</span><span>{step}</span></li>)}</ul></div>}<button onClick={nextScenario} className="action-button action-violet mt-4 flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold">{scenario===scenarios.length-1?t('View my results','ফলাফল দেখুন'):t('Next scenario','পরের পরিস্থিতি')} <ArrowRight size={14}/></button></motion.div>}</>}</motion.div>}
</AnimatePresence></div></motion.div></div></section>
<section id="about" className="about-stage relative mx-auto max-w-[1440px] overflow-hidden px-5 py-16 sm:px-8 sm:py-24">
<div className="about-glow about-glow-one"/><div className="about-glow about-glow-two"/>
<div className="relative z-10 grid gap-12 xl:grid-cols-[.88fr_1.12fr] xl:items-center xl:gap-14">
<div className="relative">
<div className="inline-flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-300/[.09] px-4 py-2 text-[10px] font-extrabold tracking-[.18em] text-violet-100"><Sparkles size={13} className="text-cyan-200"/>{t('ABOUT SHONKET AI','SHONKET AI সম্পর্কে')}</div>
<h2 className="mt-6 max-w-xl font-display text-[2.35rem] font-extrabold leading-[1.08] tracking-[-.05em] sm:text-5xl">{t('Don’t just spot a scam.','শুধু স্ক্যাম শনাক্ত নয়।')}<br/><span className="about-gradient">{t('Learn to outsmart it.','প্রতারণা চিনতে শিখুন।')}</span></h2>
<p className="mt-6 max-w-xl text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">{t('SHONKET AI is a digital-safety toolkit that helps you check suspicious message text, understand warning signs in simple language, and practise safer decisions through guided scenarios.','SHONKET AI একটি ডিজিটাল নিরাপত্তা টুলকিট। এটি সন্দেহজনক বার্তার লেখা পরীক্ষা, সহজ ভাষায় সতর্কতার সংকেত বোঝা এবং কাল্পনিক পরিস্থিতিতে নিরাপদ সিদ্ধান্ত অনুশীলনে সাহায্য করে।')}</p>
<div className="mt-7 flex flex-wrap gap-3"><button onClick={()=>go('checker')} className="about-primary group inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold"><ScanSearch size={16}/>{t('Try the scam checker','স্ক্যাম চেক করুন')}<ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"/></button><a href="#tools" onClick={()=>setActive('simulator')} className="about-secondary inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold"><ShieldCheck size={16}/>{t('Explore the tools','টুলগুলো দেখুন')}</a></div>
<div className="about-device-wrap mt-12 hidden min-h-[230px] items-center justify-center sm:flex">
<div className="about-orbit about-orbit-a"/><div className="about-orbit about-orbit-b"/>
<div className="about-float-chip chip-mail"><MessageSquareText size={22}/><span className="chip-alert">!</span></div><div className="about-float-chip chip-link"><Link2 size={23}/></div><div className="about-float-chip chip-shield"><ShieldCheck size={27}/></div>
<div className="about-device"><div className="about-device-screen"><div className="about-device-logo"><ShieldCheck size={48}/><span>S</span></div><div className="mt-2 text-[9px] font-bold tracking-[.2em] text-violet-100">DIGITAL SAFETY</div></div><div className="about-device-base"/></div>
</div>
</div>
<div className="relative">
<div className="grid gap-3 sm:grid-cols-3">
{[{icon:ScanSearch,title:t('Detect','শনাক্ত'),desc:t('Check messages, links and offers for warning signs.','বার্তা, লিংক ও অফারে সতর্ক সংকেত খুঁজুন.'),tone:'cyan',n:'01'},{icon:BrainCircuit,title:t('Understand','বুঝুন'),desc:t('Get clear explanations with evidence and risk context.','প্রমাণসহ সহজ ব্যাখ্যা ও ঝুঁকির ধারণা পান.'),tone:'violet',n:'02'},{icon:Activity,title:t('Practise','অনুশীলন'),desc:t('Build awareness through interactive scenarios.','ইন্টার‌্যাকটিভ পরিস্থিতিতে সচেতনতা গড়ুন.'),tone:'amber',n:'03'}].map(v=>{const Icon=v.icon;return <motion.div key={v.n} whileHover={{y:-7,rotateX:2}} className={`about-feature about-feature-${v.tone}`}><div className="flex items-start justify-between"><span className="about-feature-icon"><Icon size={25}/></span><span className="text-[11px] font-bold tracking-widest text-slate-500">{v.n}</span></div><div><h3 className="mt-7 font-display text-lg font-extrabold text-white">{v.title}</h3><p className="mt-2 text-xs leading-6 text-slate-300/80">{v.desc}</p></div></motion.div>})}
</div>
<div className="mt-10 sm:mt-12"><div className="mb-6 flex items-center gap-4"><span className="h-px flex-1 bg-gradient-to-r from-transparent to-violet-300/30"/><h3 className="whitespace-nowrap font-display text-xl font-extrabold sm:text-2xl">{t('The','')} <span className="about-gradient">{t('Scam-to-Skill','Scam-to-Skill')}</span> {t('Loop','প্রক্রিয়া')}</h3><span className="h-px flex-1 bg-gradient-to-l from-transparent to-cyan-300/30"/></div>
<div className="about-loop-grid">{[{icon:ScanSearch,label:t('Check','যাচাই'),tone:'cyan'},{icon:BrainCircuit,label:t('Understand','বুঝুন'),tone:'violet'},{icon:Activity,label:t('Practise','অনুশীলন'),tone:'amber'},{icon:ShieldCheck,label:t('Recognise','চিনুন'),tone:'green'}].map((v,i)=>{const Icon=v.icon;return <div className="about-loop-step" key={v.label}><motion.div animate={{y:[0,-5,0],boxShadow:['0 0 18px #0000','0 0 26px #8b5cf633','0 0 18px #0000']}} transition={{duration:3,repeat:Infinity,delay:i*.35}} className={`about-loop-icon loop-${v.tone}`}><Icon size={25}/></motion.div><span className={`about-loop-label loop-label-${v.tone}`}>{v.label}</span></div>})}</div>
</div>
<div className="mt-9 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-3"><div className="flex items-center gap-3"><Users className="text-violet-300" size={25}/><div><p className="text-sm font-extrabold text-white">{t('For everyone','সবার জন্য')}</p><p className="mt-1 text-[11px] text-slate-400">{t('Students, workers and families','শিক্ষার্থী, চাকরিজীবী ও পরিবার')}</p></div></div><div className="flex items-center gap-3"><LockKeyhole className="text-cyan-300" size={25}/><div><p className="text-sm font-extrabold text-white">{t('Practical guidance','ব্যবহারিক নির্দেশনা')}</p><p className="mt-1 text-[11px] text-slate-400">{t('Evidence-led safety tips','প্রমাণভিত্তিক নিরাপত্তা পরামর্শ')}</p></div></div><div className="flex items-center gap-3"><Activity className="text-emerald-300" size={25}/><div><p className="text-sm font-extrabold text-white">{t('Build awareness','সচেতনতা গড়ুন')}</p><p className="mt-1 text-[11px] text-slate-400">{t('Learn, practise, recognise','শিখুন, অনুশীলন করুন, চিনুন')}</p></div></div></div>

</div>
</div>
</section></main>
<footer className="relative z-10 border-t border-white/[.08]"><div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between"><Brand/><p className="max-w-lg text-xs leading-5 text-slate-500">{t('Rule-based guidance, not a guarantee. Verify important requests through official channels. Never share OTPs or passwords.','নিয়মভিত্তিক নির্দেশনা, নিশ্চয়তা নয়। গুরুত্বপূর্ণ অনুরোধ অফিসিয়াল মাধ্যমে যাচাই করুন। কখনো OTP বা পাসওয়ার্ড শেয়ার করবেন না।')}</p></div></footer>
<nav className="mobile-tool-dock" aria-label={t('Quick tool navigation','দ্রুত টুল নেভিগেশন')}>
  {nav.map(([id,label])=>{
    const Icon=id==='checker'?ShieldCheck:id==='links'?Link2:id==='simulator'?BrainCircuit:History;
    return <button key={id} type="button" aria-label={label} aria-pressed={active===id} onClick={()=>go(id)} className={active===id?'is-active':''}>
      <Icon size={18} strokeWidth={2.2} aria-hidden="true"/>
      <span>{label}</span>
    </button>;
  })}
</nav>
</div>
}

class AppErrorBoundary extends Component{
  constructor(props){
    super(props);
    this.state={hasError:false};
  }
  static getDerivedStateFromError(){
    return {hasError:true};
  }
  componentDidCatch(error,info){
    console.error('SHONKET application render error:',error,info);
  }
  render(){
    if(this.state.hasError){
      return <main className="flex min-h-screen items-center justify-center bg-[#080914] px-6 text-slate-100">
        <section className="w-full max-w-lg rounded-3xl border border-violet-300/20 bg-white/[.04] p-8 text-center shadow-2xl">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-400/10 text-violet-200"><ShieldCheck size={28}/></div>
          <h1 className="mt-5 text-2xl font-extrabold">SHONKET AI</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">Something went wrong while displaying the app. Your page has not been permanently damaged. Refresh and try again.</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">অ্যাপ দেখাতে সমস্যা হয়েছে। পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।</p>
          <button type="button" onClick={()=>window.location.reload()} className="mt-6 rounded-full bg-violet-500 px-6 py-3 text-sm font-bold text-white hover:bg-violet-400">Refresh page · রিফ্রেশ করুন</button>
        </section>
      </main>;
    }
    return this.props.children;
  }
}

export default function App(){
  return <AppErrorBoundary><AppContent/></AppErrorBoundary>;
}
