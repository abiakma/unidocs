import type { CertificatePurpose, CertificateType, DocumentLanguage } from "../../generated/prisma/enums.js";

// Text printed on certificates. Kept apart from the rendering code so the
// university can review and correct the official wording in one place.

type Texts<T extends string> = Record<T, Record<DocumentLanguage, string>>;

export const UNIVERSITY_NAME: Record<DocumentLanguage, string> = {
  KK: "Алматы гуманитарлық-экономикалық университеті",
  RU: "Алматинский гуманитарно-экономический университет",
  EN: "Almaty Humanitarian-Economic University",
};

export const CERTIFICATE_TITLES: Texts<CertificateType> = {
  ENROLLMENT_CERTIFICATE: {
    KK: "ОҚУ ОРНЫНАН АНЫҚТАМА",
    RU: "СПРАВКА С МЕСТА УЧЁБЫ",
    EN: "CERTIFICATE OF ENROLLMENT",
  },
  STUDENT_STATUS_LETTER: {
    KK: "СТУДЕНТ МӘРТЕБЕСІ ТУРАЛЫ АНЫҚТАМА",
    RU: "СПРАВКА О СТАТУСЕ СТУДЕНТА",
    EN: "STUDENT STATUS LETTER",
  },
  INTERNSHIP_CONFIRMATION: {
    KK: "ТӘЖІРИБЕДЕН ӨТУГЕ АРНАЛҒАН РАСТАУ ХАТ",
    RU: "ПОДТВЕРЖДЕНИЕ ДЛЯ ПРОХОЖДЕНИЯ ПРАКТИКИ",
    EN: "INTERNSHIP CONFIRMATION LETTER",
  },
  TRANSCRIPT_REQUEST: {
    KK: "ОҚУ ТУРАЛЫ АНЫҚТАМА",
    RU: "СПРАВКА ОБ ОБУЧЕНИИ",
    EN: "CERTIFICATE OF STUDY",
  },
  VISA_SUPPORT_LETTER: {
    KK: "ВИЗАЛЫҚ ҚОЛДАУ ХАТЫ",
    RU: "ПИСЬМО ДЛЯ ВИЗОВОЙ ПОДДЕРЖКИ",
    EN: "VISA SUPPORT LETTER",
  },
  GRADUATION_CONFIRMATION: {
    KK: "ОҚУ ОРНЫН БІТІРГЕНІ ТУРАЛЫ АНЫҚТАМА",
    RU: "СПРАВКА ОБ ОКОНЧАНИИ ОБУЧЕНИЯ",
    EN: "CERTIFICATE OF GRADUATION",
  },
};

export const PURPOSE_TEXTS: Texts<CertificatePurpose> = {
  EMPLOYMENT: { KK: "жұмыс беруші", RU: "работодатель", EN: "employer" },
  INTERNSHIP: { KK: "тәжірибе өтетін орын", RU: "место прохождения практики", EN: "internship provider" },
  VISA_APPLICATION: { KK: "елшілік / визалық орталық", RU: "посольство / визовый центр", EN: "embassy / visa centre" },
  SCHOLARSHIP: { KK: "стипендия бағдарламасы", RU: "стипендиальная программа", EN: "scholarship programme" },
  BANK: { KK: "банк", RU: "банк", EN: "bank" },
  OTHER: { KK: "талап ету орны", RU: "по месту требования", EN: "upon request" },
};

export interface BodyValues {
  name: string;
  university: string;
  faculty: string;
  specialty: string;
  course: number;
  group: string;
  studyForm: string;
  enrollmentDate: string;
  graduationDate: string;
}

export function studentBody(language: DocumentLanguage, graduated: boolean, v: BodyValues): string {
  if (graduated) {
    switch (language) {
      case "KK":
        return `Осы анықтама ${v.name} ${v.university} бітіргенін растайды: ${v.faculty}, «${v.specialty}» білім беру бағдарламасы. Бітірген күні: ${v.graduationDate}.`;
      case "RU":
        return `Настоящая справка подтверждает, что ${v.name} окончил(а) ${v.university}: ${v.faculty}, образовательная программа «${v.specialty}». Дата окончания: ${v.graduationDate}.`;
      case "EN":
        return `This is to certify that ${v.name} graduated from ${v.university}: ${v.faculty}, educational programme “${v.specialty}”. Graduation date: ${v.graduationDate}.`;
    }
  }

  switch (language) {
    case "KK":
      return `Осы анықтама ${v.name} шынымен ${v.university} білім алушысы екенін растайды: ${v.faculty}, «${v.specialty}» білім беру бағдарламасы, ${v.course}-курс, ${v.group} тобы, оқу нысаны — ${v.studyForm}. Оқуға қабылданған күні: ${v.enrollmentDate}.`;
    case "RU":
      return `Настоящая справка подтверждает, что ${v.name} действительно является обучающимся ${v.university}: ${v.faculty}, образовательная программа «${v.specialty}», ${v.course} курс, группа ${v.group}, форма обучения — ${v.studyForm}. Дата зачисления: ${v.enrollmentDate}.`;
    case "EN":
      return `This is to certify that ${v.name} is a student of ${v.university}: ${v.faculty}, educational programme “${v.specialty}”, year ${v.course}, group ${v.group}, ${v.studyForm} study. Enrollment date: ${v.enrollmentDate}.`;
  }
}

export const LABELS: Texts<
  | "documentNumber"
  | "issueDate"
  | "validUntil"
  | "purpose"
  | "signer"
  | "scanToVerify"
  | "logoPlaceholder"
  | "previewWatermark"
  | "testWatermark"
  | "testFooter"
  | "previewFooter"
  | "officialFooter"
  | "testSignatureNote"
> = {
  documentNumber: { KK: "Құжат нөмірі", RU: "Номер документа", EN: "Document No." },
  issueDate: { KK: "Берілген күні", RU: "Дата выдачи", EN: "Issue date" },
  validUntil: { KK: "Жарамды мерзімі", RU: "Действительна до", EN: "Valid until" },
  purpose: {
    KK: "Анықтама ұсыну үшін берілді",
    RU: "Справка выдана для предоставления",
    EN: "Issued for submission to",
  },
  signer: { KK: "Уәкілетті тұлға", RU: "Уполномоченное лицо", EN: "Authorized signatory" },
  scanToVerify: {
    KK: "Түпнұсқалығын тексеру үшін QR кодты сканерлеңіз",
    RU: "Отсканируйте QR-код для проверки подлинности",
    EN: "Scan the QR code to verify authenticity",
  },
  logoPlaceholder: { KK: "ЛОГОТИП", RU: "ЛОГОТИП", EN: "LOGO" },
  previewWatermark: { KK: "АЛДЫН АЛА ҚАРАУ", RU: "ПРЕДПРОСМОТР", EN: "PREVIEW" },
  testWatermark: { KK: "TEST / NOT LEGALLY SIGNED", RU: "TEST / NOT LEGALLY SIGNED", EN: "TEST / NOT LEGALLY SIGNED" },
  testFooter: {
    KK: "ТЕСТ ҚҰЖАТ — ЗАҢДЫ ТҮРДЕ ҚОЛ ҚОЙЫЛМАҒАН. TEST DOCUMENT — NOT LEGALLY SIGNED.",
    RU: "ТЕСТОВЫЙ ДОКУМЕНТ — ЮРИДИЧЕСКИ НЕ ПОДПИСАН. TEST DOCUMENT — NOT LEGALLY SIGNED.",
    EN: "TEST DOCUMENT — NOT LEGALLY SIGNED.",
  },
  previewFooter: {
    KK: "Алдын ала қарауға арналған көшірме. Қол қойылмаған, жарамсыз.",
    RU: "Копия для предпросмотра. Не подписана, недействительна.",
    EN: "Preview copy. Not signed and not valid.",
  },
  officialFooter: {
    KK: "Құжат электрондық цифрлық қолтаңбамен қол қойылған.",
    RU: "Документ подписан электронной цифровой подписью.",
    EN: "This document is signed with an electronic digital signature.",
  },
  testSignatureNote: { KK: "(тест қолтаңбасы)", RU: "(тестовая подпись)", EN: "(test signature)" },
};
