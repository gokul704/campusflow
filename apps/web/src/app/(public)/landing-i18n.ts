import type { NewsItem } from "./landing-types";

export type LandingLocale = "en" | "hi";

function b(en: string, hi: string): Record<LandingLocale, string> {
  return { en, hi };
}

/** Flat UI strings — use via `copy.xxx` from `getLandingCopy(locale)`. */
export const landingFlat = {
  topAdmissions: b("Admissions open 2025-26", "प्रवेश 2025-26 के लिए खुले हैं"),
  langEnglish: b("English", "English"),
  langHindi: b("हिंदी", "हिंदी"),
  langSwitcherAria: b("Site language", "साइट की भाषा"),

  navAbout: b("About", "परिचय"),
  navAcademics: b("Academics", "शिक्षण"),
  navAboutSub: b("About", "परिचय"),
  navPrincipal: b("Principal", "प्राचार्य"),
  navVision: b("Vision & Mission", "दृष्टि व मिशन"),
  navCourses: b("Courses Offered", "प्रस्तावित पाठ्यक्रम"),
  navAdmissions: b("Admissions", "प्रवेश"),
  navDepartments: b("Departments", "विभाग"),
  navFaculty: b("Faculty", "संकाय"),
  navFacilities: b("Facilities", "सुविधाएँ"),
  navEvents: b("Events", "कार्यक्रम"),
  navGallery: b("Gallery", "गैलरी"),
  navContact: b("Contact", "संपर्क"),
  navPortalLogin: b("Portal Login", "पोर्टल लॉगिन"),

  heroTitle: b(
    "MAA Institute of Speech and Hearing (MISH)",
    "एमएए इंस्टीट्यूट ऑफ स्पीच एंड हियरिंग (एमआईएसएच)"
  ),
  heroLead: b(
    "Your journey to becoming a skilled hearing & speech professional starts now. Accredited courses, expert faculty, and hands-on training for your future.",
    "एक कुशल श्रवण एवं वाणी पेशेवर बनने की आपकी यात्रा यहीं से शुरू होती है। मान्यता प्राप्त पाठ्यक्रम, अनुभवी संकाय और भविष्य के लिए व्यावहारिक प्रशिक्षण।"
  ),
  heroExplore: b("Explore Programs", "पाठ्यक्रम देखें"),
  heroContact: b("Contact Us", "संपर्क करें"),

  aboutHeading: b("About MISH", "एमआईएसएच के बारे में"),
  aboutP1: b(
    "MAA Institute of Speech and Hearing (MISH) is a comprehensive multi-purpose institute focusing on the identification, intervention, rehabilitation and education of individuals with speech and hearing disorders.",
    "एमएए इंस्टीट्यूट ऑफ स्पीच एंड हियरिंग (एमआईएसएच) एक व्यापक बहुउद्देशीय संस्थान है, जो वाणी और श्रवण विकारों वाले व्यक्तियों की पहचान, हस्तक्षेप, पुनर्वास और शिक्षा पर केंद्रित है।"
  ),
  aboutP2: b(
    "Established in 2019, MISH offers accredited programs with expert faculty and a hospital-campus learning environment for real-world clinical exposure.",
    "2019 में स्थापित, एमआईएसएच मान्यता प्राप्त कार्यक्रम, विशेषज्ञ संकाय और वास्तविक नैदानिक अनुभव के लिए अस्पताल-कैंपस शिकरण वातावरण प्रदान करता है।"
  ),

  principalHeading: b("From the Principal", "प्राचार्य के कलम से"),
  principalLead: b("Brief profile", "संक्षिप्त परिचय"),
  principalName: b("Dr. Aparna Ravichandran", "डॉ. अपर्णा रविचंद्रन"),
  principalRole: b("Professor & Principal, MISH", "प्रोफेसर एवं प्राचार्य, एमआईएसएच"),
  principalPhotoAlt: b(
    "Portrait of Dr. Aparna Ravichandran, Professor and Principal, MISH",
    "डॉ. अपर्णा रविचंद्रन, प्रोफेसर एवं प्राचार्य, एमआईएसएच — प्रोफ़ाइल चित्र"
  ),

  visionTitle: b("Our Vision", "हमारी दृष्टि"),
  visionBody: b(
    "To be a global centre of excellence in healthcare, research, and education - driving innovation, empowering communities, and transforming lives through compassion and care.",
    "स्वास्थ्य सेवा, अनुसंधान और शिक्षा में उत्कृष्टता का वैश्विक केंद्र बनना—नवाचार को बढ़ावा, समुदायों को सशक्त बनाना और करुणा व देखभाल के माध्यम से जीवन बदलना।"
  ),
  missionTitle: b("Our Mission", "हमारा मिशन"),
  missionBody: b(
    "To deliver accessible, high-quality healthcare, advance impactful research, and educate future professionals who create lasting change through innovation, compassion, and care.",
    "सुलभ, उच्च गुणवत्ता वाली स्वास्थ्य सेवा देना, प्रभावशाली अनुसंधान को आगे बढ़ाना और भविष्य के पेशेवरों को तैयार करना जो नवाचार, करुणा और देखभाल से स्थायी बदलाव लाएँ।"
  ),

  programsHeading: b("Courses Offered", "प्रस्तावित पाठ्यक्रम"),
  programsLead: b(
    "Accredited programs with hands-on training for clinical excellence.",
    "नैदानिक उत्कृष्टता के लिए व्यावहारिक प्रशिक्षण के साथ मान्यता प्राप्त कार्यक्रम।"
  ),
  progBaslpSub: b(
    "Bachelor in Audiology and Speech Language Pathology",
    "स्नातक — श्रवण विज्ञान एवं वाणी-भाषा पैथोलॉजी"
  ),
  progPgdeiSub: b("Post Graduate Diploma in Early Intervention", "स्नातकोत्तर डिप्लोमा इन अर्ली इंटरवेंशन"),
  progMscSub: b("Master of Science in Audiology", "एम.एससी. ऑडियोलॉजी में स्नातकोत्तर"),
  applyEnquire: b("Apply / Enquire", "आवेदन / पूछताछ"),

  deptHeading: b("Departments", "विभाग"),
  deptLead: b("Limitless learning, more possibilities.", "असीम सीख, अधिक संभावनाएँ।"),

  facultyHeading: b("Core faculty", "मुख्य संकाय"),
  facultyLead: b(
    "Meet the experienced educators and clinicians guiding students at MISH.",
    "एमआईएसएच में छात्रों का मार्गदर्शन करने वाले अनुभवी शिक्षक व क्लिनिशियन।"
  ),
  facultyCarouselAria: b("Core faculty carousel", "मुख्य संकाय स्लाइडर"),
  facultyPrev: b("Previous slide", "पिछली स्लाइड"),
  facultyNext: b("Next slide", "अगली स्लाइड"),
  facultyDotsAria: b("Carousel pages", "स्लाइड पृष्ठ"),
  facultyPageOf: b("Page", "पृष्ठ"),
  facultyLabelDepartment: b("Department", "विभाग"),
  facultyLabelAcademic: b("Academic qualification", "शैक्षणिक योग्यता"),
  facultyLabelRehab: b("Rehabilitation qualification", "पुनर्वास योग्यता"),
  facultyLabelExperience: b("Experience", "अनुभव"),
  facultyLabelRci: b("RCI Reg. No.", "आरसीआई पंजी. सं."),
  facultyLabelValid: b("Valid till", "वैध तक"),
  facultyLabelJoined: b("Date of joining", "जॉइनिंग की तारीख"),
  facultyEmpty: b("—", "—"),
  dept1: b("Department of Audiology", "श्रवण विज्ञान विभाग"),
  dept2: b("Department of Cochlear Implant", "कॉक्लियर इम्प्लांट विभाग"),
  dept3: b("Department of Early Intervention", "शीघ्र हस्तक्षेप विभाग"),
  dept4: b("Department of Hearing & Hearing Science", "श्रवण एवं श्रवण विज्ञान विभाग"),

  facilitiesHeading: b("Campus Facilities", "कैंपस सुविधाएँ"),
  facilitiesLead: b(
    "A vibrant community with infrastructure and resources to support learning, clinical training, and student life.",
    "सीखने, नैदानिक प्रशिक्षण और छात्र जीवन के लिए अवसंरचना और संसाधनों के साथ एक सजीव समुदाय।"
  ),
  facAuditorium: b("Auditorium", "सभागार"),
  facCafeteria: b("Cafeteria", "कैफ़ेटेरिया"),
  facSports: b("Sports & Games", "खेल व क्रीड़ा"),
  facLibrary: b("Library", "पुस्तकालय"),

  eventsHeading: b("News & campus highlights", "समाचार व कैंपस झलकियाँ"),
  eventsLead: b(
    "Campus life in the spotlight; latest headlines scroll beside it—tap any headline for details and a photo.",
    "कैंपस जीवन केंद्र में; ताज़ा शीर्षक बगल में ऊपर की ओर स्क्रॉल होते हैं—विवरण और फ़ोटो के लिए किसी भी शीर्षक पर टैप करें।"
  ),
  campusPill: b("Campus", "कैंपस"),
  tapEnlarge: b("Tap to enlarge", "बड़ा करने के लिए टैप करें"),
  prevHighlight: b("Previous highlight", "पिछली झलक"),
  nextHighlight: b("Next highlight", "अगली झलक"),
  highlightDotsAria: b("Campus highlight slides", "कैंपस झलक स्लाइड"),
  highlightOf: b("Highlight", "झलक"),

  latestNewsHeading: b("Latest news", "ताज़ा समाचार"),
  latestNewsHint: b(
    "Scrolls automatically; hover to pause. Click an item to read more.",
    "स्वतः स्क्रॉल होता है; रोकने के लिए होवर करें। अधिक पढ़ने के लिए किसी मद पर क्लिक करें।"
  ),
  highlightsRegionAria: b("Campus highlights", "कैंपस झलकियाँ"),
  latestNewsAsideAria: b("Latest news", "ताज़ा समाचार"),

  galleryHeading: b("Campus Gallery", "कैंपस गैलरी"),
  galleryLead: b(
    "A snapshot of academic life, seminars, workshops, and celebrations at MISH. Use the arrows to browse, or open any photo full size.",
    "एमआईएसएच में शैक्षणिक जीवन, सेमिनार, कार्यशालाओं और उत्सवों की झलक। तीरों से ब्राउज़ करें, या किसी भी फ़ोटो को पूर्ण आकार में खोलें।"
  ),
  galleryCarouselAria: b("Campus gallery", "कैंपस गैलरी"),
  prevPhoto: b("Previous photo", "पिछला फ़ोटो"),
  nextPhoto: b("Next photo", "अगला फ़ोटो"),
  goToPhoto: b("Go to photo", "फ़ोटो पर जाएँ"),
  openCampusPhoto: b("Open campus photo", "कैंपस फ़ोटो खोलें"),

  contactHeading: b("Reach Us", "हम तक पहुँचें"),
  contactLead: b(
    "Have questions about admissions or programs? Get in touch with the team.",
    "प्रवेश या पाठ्यक्रमों के बारे में प्रश्न हैं? टीम से संपर्क करें।"
  ),
  contactFollowUs: b("Follow us", "हमारे साथ जुड़ें"),
  sendMessageHeading: b("Send a message", "संदेश भेजें"),
  sendMessageLead: b("We will get back to you as soon as we can.", "हम जल्द से जल्द आपसे संपर्क करेंगे।"),
  labelName: b("Name", "नाम"),
  labelEmail: b("Email", "ईमेल"),
  labelPhone: b("Phone", "फ़ोन"),
  optional: b("(optional)", "(वैकल्पिक)"),
  labelMessage: b("Message", "संदेश"),
  phName: b("Your full name", "आपका पूरा नाम"),
  phEmail: b("you@example.com", "you@example.com"),
  phPhone: b("+91 …", "+91 …"),
  phMessage: b("Admissions, programs, or other questions…", "प्रवेश, पाठ्यक्रम या अन्य प्रश्न…"),
  btnSend: b("Send message", "संदेश भेजें"),

  contactErr: b("Please enter your name, email, and message.", "कृपया अपना नाम, ईमेल और संदेश दर्ज करें।"),
  contactOk: b(
    "If your email app opened, send the message from there. You can also reach us at admin@mish.com.",
    "यदि आपका ईमेल ऐप खुल गया है, तो वहीं से संदेश भेजें। आप admin@mish.com पर भी संपर्क कर सकते हैं।"
  ),

  footerVisitors: b("Site visits", "साइट विज़िट"),
  footerVisitorsLoading: b("…", "…"),
  footerVisitorsUnavailable: b("—", "—"),

  footerAboutLabel: b("About MISH:", "एमआईएसएच के बारे में:"),
  footerAboutBody: b(
    "MAA Institute of Speech and Hearing (MISH) is a comprehensive multi-purpose institute focusing on identification, intervention, rehabilitation and education of individuals with speech and hearing disorders.",
    "एमएए इंस्टीट्यूट ऑफ स्पीच एंड हियरिंग (एमआईएसएच) वाणी और श्रवण विकारों वाले व्यक्तियों की पहचान, हस्तक्षेप, पुनर्वास और शिक्षा पर केंद्रित एक व्यापक बहुउद्देशीय संस्थान है।"
  ),

  photoPreview: b("Photo preview", "फ़ोटो पूर्वावलोकन"),
  closePreview: b("Close preview", "पूर्वावलोकन बंद करें"),
  closeDialog: b("Close", "बंद करें"),

  openGallery: b("Open gallery", "गैलरी खोलें"),

  toggleMenu: b("Toggle menu", "मेनू टॉगल करें"),
  showPhoto: b("Show photo", "फ़ोटो दिखाएँ"),
  openFacilitiesPhoto: b("Open facilities photo", "सुविधा फ़ोटो खोलें"),
  buildingAlt: b("MAA Institute of Speech and Hearing campus building", "एमआईएसएच कैंपस भवन"),
  heroCampusAlt: b("MAA Institute of Speech and Hearing — campus photo", "एमआईएसएच — कैंपस फ़ोटो"),
  facilitiesImgAlt: b("MISH campus facilities", "एमआईएसएच कैंपस सुविधाएँ"),
  mishCampusPhotoN: b("MISH campus photo", "एमआईएसएच कैंपस फ़ोटो"),
} as const;

export type LandingFlatKey = keyof typeof landingFlat;

function pickFlat(locale: LandingLocale): Record<LandingFlatKey, string> {
  const out = {} as Record<LandingFlatKey, string>;
  (Object.keys(landingFlat) as LandingFlatKey[]).forEach((k) => {
    out[k] = landingFlat[k][locale];
  });
  return out;
}

const HERO_QUOTES_EN = [
  { text: "Learn. Heal. Inspire", author: "MISH" },
  { text: "WHERE HEARING MEETS HOPE", author: "MISH" },
  { text: "Empowering Communication", author: "MISH" },
] as const;

const HERO_QUOTES_HI = [
  { text: "सीखें। उपचार करें। प्रेरित करें।", author: "एमआईएसएच" },
  { text: "जहाँ श्रवण आशा से मिलता है", author: "एमआईएसएच" },
  { text: "संचार को सशक्त बनाना", author: "एमआईएसएच" },
] as const;

const PRINCIPAL_PROFILE_EN = [
  "Dr. Aparna Ravichandran is Professor and Principal at MISH, where she leads both academic and administrative functions. She is deeply committed to teaching and mentoring, with expertise across a wide range of subjects in audiology.",
  "She holds an M.Sc. in ASLP and an interdisciplinary Ph.D., along with an M.Sc. in Psychology, an MBA in HRM, an M.A. in Linguistics, and a PG Diploma in Applied Linguistics.",
  "She has over 25 years of experience teaching undergraduate and postgraduate students. She has served as Lecturer, Reader, Head of Department, and Officer-in-charge Principal at Sweekaar Institute of Speech and Hearing, and as Lecturer at the Ali Yavar Jung National Institute of Speech and Hearing Disabilities (Divyangjan), Secunderabad.",
  "As Professor in Audiology, she teaches hearing sciences, auditory perception, genetics of hearing, paediatric audiology, amplification devices, and related topics—blending theory with practice. She mentors students from diverse backgrounds and helps them reach their potential.",
  "She is a member of the Board of Studies (ASLP) at Osmania University and has served on examination boards for ASLP programmes at Bangalore University, Sri Padmavathi Mahila University, Sri Ramachandra University, MUHS, Jaipur University, and others.",
  "She has guided more than 60 master’s research dissertations. She is an invited speaker at national and international conferences, has published in national and international journals, serves as a reviewer for multiple journals, and is an editor for a book series. Her research interests include early intervention, school readiness, speech perception, and amplification devices.",
  "She received the Muktesh Award for best paper on hearing aids at ISHACON. She has coordinated many STPs, RCI–CRE programmes, seminars, and two national conferences—ISHACON and NCED—held in Hyderabad.",
  "She has contributed to professional development manuals for B.Ed. Spl.Ed. at BRAOU. She has received several accolades, including Best Teacher at Sweekaar, for her contributions to teaching, research, and dedication.",
  "She believes in the holistic development of students and in serving the community with compassion and excellence.",
] as const;

/** Condensed Hindi summary aligned with the English profile. */
const PRINCIPAL_PROFILE_HI = [
  "डॉ. अपर्णा रविचंद्रन एमआईएसएच में प्रोफेसर एवं प्राचार्य हैं और शैक्षणिक व प्रशासनिक दोनों क्षेत्रों का नेतृत्व करती हैं। ऑडियोलॉजी के विविध विषयों में उनकी विशेषज्ञता है और वे शिक्षण व मार्गदर्शन के प्रति समर्पित हैं।",
  "उनकी योग्यताओं में एएसएलपी में एम.एससी., अंतःविषय पीएच.डी., मनोविज्ञान में एम.एससी., मानव संसाधन प्रबंधन में एमबीए, भाषाविज्ञान में एम.ए. तथा अनुप्रयुक्त भाषाविज्ञान में पीजी डिप्लोमा शामिल हैं।",
  "25 वर्ष से अधिक अनुभव में उन्होंने स्नातक व स्नातकोत्तर छात्रों को पढ़ाया है। स्वीकार इंस्टीट्यूट ऑफ स्पीच एंड हियरिंग में व्याख्याता, रीडर, विभागाध्यक्ष व प्राचार्य (प्रभार) तथा सिकंदराबाद स्थित अली यावर जंग राष्ट्रीय वाणी-श्रवण विकलांगता संस्थान में व्याख्याता के पद रहे हैं।",
  "ऑडियोलॉजी में प्रोफेसर के रूप में वे श्रवण विज्ञान, श्रवण धारणा, श्रवण आनुवंशिकी, बाल ऑडियोलॉजी, प्रवर्धन उपकरण आदि का सैद्धांतिक व व्यावहारिक ज्ञान देती हैं और विविध पृष्ठभूमि के छात्रों का मार्गदर्शन करती हैं।",
  "वे उस्मानिया विश्वविद्यालय में एएसएलपी बोर्ड ऑफ स्टडीज़ की सदस्य हैं तथा बैंगलोर, श्री पद्मावती महिला, श्री रामचंद्र, MUHS, जयपुर आदि विश्वविद्यालयों में एएसएलपी परीक्षा बोर्ड से जुड़ी रही हैं।",
  "उन्होंने 60 से अधिक स्नातकोत्तर शोध प्रबंधों का मार्गदर्शन किया है; राष्ट्रीय व अंतरराष्ट्रीय सम्मेलनों में आमंत्रित वक्ता, पत्रिकाओं में प्रकाशन, समीक्षक व पुस्तक श्रृंखला संपादक हैं। शोध रुचि: शीघ्र हस्तक्षेप, स्कूल तत्परता, वाणी धारणा, प्रवर्धन उपकरण।",
  "आईएसएचएकॉन में श्रवण यंत्रों पर सर्वश्रेष्ठ पत्र हेतु मुक्तेश पुरस्कार। कई एसटीपी, आरसीआई-सीआरई कार्यक्रम, सेमिनार तथा हैदराबाद में आईएसएचएकॉन व एनसीईडी राष्ट्रीय सम्मेलनों का समन्वय। बीआरएओयू के बी.एड. विशेष शिक्षा हेतु पेशेवर विकास मैनुअल में योगदान। स्वीकार में सर्वश्रेष्ठ शिक्षक सहित कई सम्मान।",
  "छात्रों के समग्र विकास तथा करुणा व उत्कृष्टता के साथ समुदाय की सेवा में उनकी गहरी आस्था है।",
] as const;

const EVENT_SPOTLIGHT_I18N = [
  {
    title: b("Seminars & guest sessions", "सेमिनार व अतिथि सत्र"),
    caption: b(
      "Students and faculty in the institute auditorium.",
      "संस्थान सभागार में छात्र और संकाय।"
    ),
  },
  {
    title: b("Workshops & clinical training", "कार्यशालाएँ व नैदानिक प्रशिक्षण"),
    caption: b(
      "Hands-on learning with a strong clinical orientation.",
      "मजबूत नैदानिक अभिविन्यास के साथ व्यावहारिक सीख।"
    ),
  },
  {
    title: b("Community & celebrations", "समुदाय व उत्सव"),
    caption: b(
      "Campus events that bring students and mentors together.",
      "ऐसे कैंपस आयोजन जो छात्रों और मार्गदर्शकों को जोड़ते हैं।"
    ),
  },
] as const;

const NEWS_I18N = [
  {
    title: b(
      "World Audiologist Day Celebrations at MAA Hospitals",
      "विश्व ऑडियोलॉजिस्ट दिवस समारोह, एमएए अस्पतालों में"
    ),
    description: b(
      "Students and faculty joined World Audiologist Day celebrations with awareness activities and a shared commitment to hearing health and professional excellence at MAA Hospitals.",
      "छात्रों और संकाय ने एमएए अस्पतालों में जागरूकता गतिविधियों और श्रवण स्वास्थ्य तथा पेशेवर उत्कृष्टता के प्रति साझा प्रतिबद्धता के साथ विश्व ऑडियोलॉजिस्ट दिवस मनाया।"
    ),
  },
  {
    title: b("MANOGNA - Suicide Prevention Awareness Program", "मनोग्ना — आत्महत्या रोकथाम जागरूकता कार्यक्रम"),
    description: b(
      "An awareness program focused on mental health, early support, and community education—reinforcing MISH’s role in holistic care beyond the clinic.",
      "मानसिक स्वास्थ्य, शीघ्र सहायता और समुदाय शिक्षा पर केंद्रित जागरूकता कार्यक्रम—क्लिनिक से परे समग्र देखभाल में एमआईएसएच की भूमिका को मजबूत करता है।"
    ),
  },
  {
    title: b(
      "Basic Education & Literacy - Elocution & Essay Competition",
      "मूल शिक्षा व साक्षरता — वक्तृत्व व निबंध प्रतियोगिता"
    ),
    description: b(
      "Students took part in elocution and essay competitions to strengthen communication skills and confidence in line with our literacy and education goals.",
      "छात्रों ने हमारी साक्षरता व शिक्षा लक्ष्यों के अनुरूप संचार कौशल और आत्मविश्वास बढ़ाने के लिए वक्तृत्व व निबंध प्रतियोगिताओं में भाग लिया।"
    ),
  },
  {
    title: b(
      "COSMI Workshop 2025 - Comprehensive Sensory Motor Intervention",
      "COSMI कार्यशाला 2025 — व्यापक संवेदी-मोटर हस्तक्षेप"
    ),
    description: b(
      "Hands-on training in comprehensive sensory motor intervention, bringing together theory and practice for therapists and trainees on campus.",
      "कैंपस पर चिकित्सकों और प्रशिक्षुओं के लिए सिद्धांत व अभ्यास को जोड़ते हुए व्यापक संवेदी-मोटर हस्तक्षेप में व्यावहारिक प्रशिक्षण।"
    ),
  },
] as const;

const NEWS_DATES = ["10/10/2025", "20/09/2025", "13/09/2025", "26/07/2025"] as const;
const NEWS_IMAGE_INDEX = [0, 1, 2, 3] as const;

export function getLatestNews(locale: LandingLocale): NewsItem[] {
  return NEWS_I18N.map((n, i) => ({
    title: n.title[locale],
    description: n.description[locale],
    date: NEWS_DATES[i]!,
    imageIndex: NEWS_IMAGE_INDEX[i]!,
  }));
}

export function getHeroQuotes(locale: LandingLocale) {
  return locale === "hi" ? HERO_QUOTES_HI : HERO_QUOTES_EN;
}

export function getPrincipalProfileParagraphs(locale: LandingLocale): readonly string[] {
  return locale === "hi" ? PRINCIPAL_PROFILE_HI : PRINCIPAL_PROFILE_EN;
}

export function getEventSpotlightSlides(
  locale: LandingLocale,
  gallery: readonly string[],
  indices: readonly [number, number, number]
) {
  return EVENT_SPOTLIGHT_I18N.map((item, i) => ({
    title: item.title[locale],
    caption: item.caption[locale],
    src: gallery[indices[i]!]!,
  }));
}

export type LandingCopy = ReturnType<typeof getLandingCopy>;

export function getLandingCopy(locale: LandingLocale) {
  const f = pickFlat(locale);
  return {
    ...f,
    heroQuotes: getHeroQuotes(locale),
    latestNews: getLatestNews(locale),
    principalProfileParagraphs: getPrincipalProfileParagraphs(locale),
  };
}
