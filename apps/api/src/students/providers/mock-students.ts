import type { LocalizedText, StudentAcademicProfile } from "../student-data.types.js";

// FICTIONAL test students for local development. Not real people, not real Platonus data.

const ECONOMICS: LocalizedText = {
  kk: "Экономика факультеті",
  ru: "Экономический факультет",
  en: "Faculty of Economics",
};

const LAW: LocalizedText = {
  kk: "Құқық факультеті",
  ru: "Юридический факультет",
  en: "Faculty of Law",
};

const HUMANITIES: LocalizedText = {
  kk: "Гуманитарлық ғылымдар факультеті",
  ru: "Факультет гуманитарных наук",
  en: "Faculty of Humanities",
};

const FULL_TIME: LocalizedText = { kk: "күндізгі", ru: "очная", en: "full-time" };

export const MOCK_STUDENTS: readonly StudentAcademicProfile[] = [
  {
    externalStudentId: "PL-100001",
    fullName: "Сейітова Айгерім Нұрланқызы",
    faculty: ECONOMICS,
    specialty: { kk: "6B04101 Экономика", ru: "6B04101 Экономика", en: "6B04101 Economics" },
    course: 3,
    group: "ЭК-23-1",
    studyForm: FULL_TIME,
    educationStatus: "ACTIVE",
    enrollmentDate: "2023-09-01",
    graduationDate: null,
  },
  {
    externalStudentId: "PL-100002",
    fullName: "Жақсыбеков Данияр Ерланұлы",
    faculty: LAW,
    specialty: { kk: "6B04201 Құқықтану", ru: "6B04201 Юриспруденция", en: "6B04201 Jurisprudence" },
    course: 2,
    group: "ЮР-24-2",
    studyForm: FULL_TIME,
    educationStatus: "ACTIVE",
    enrollmentDate: "2024-09-01",
    graduationDate: null,
  },
  {
    externalStudentId: "PL-100003",
    fullName: "Құрманғалиева Әлия Бақытжанқызы",
    faculty: HUMANITIES,
    specialty: {
      kk: "6B02301 Аударма ісі",
      ru: "6B02301 Переводческое дело",
      en: "6B02301 Translation Studies",
    },
    course: 4,
    group: "АИ-22-1",
    studyForm: FULL_TIME,
    educationStatus: "ACTIVE",
    enrollmentDate: "2022-09-01",
    graduationDate: null,
  },
  {
    externalStudentId: "PL-100004",
    fullName: "Оспанов Тимур Асқарұлы",
    faculty: ECONOMICS,
    specialty: { kk: "6B04103 Қаржы", ru: "6B04103 Финансы", en: "6B04103 Finance" },
    course: 2,
    group: "ҚР-24-1",
    studyForm: FULL_TIME,
    educationStatus: "ACADEMIC_LEAVE",
    enrollmentDate: "2024-09-01",
    graduationDate: null,
  },
  {
    externalStudentId: "PL-100005",
    fullName: "Ахметова Мадина Серікқызы",
    faculty: LAW,
    specialty: { kk: "6B04201 Құқықтану", ru: "6B04201 Юриспруденция", en: "6B04201 Jurisprudence" },
    course: 4,
    group: "ЮР-21-1",
    studyForm: FULL_TIME,
    educationStatus: "GRADUATED",
    enrollmentDate: "2021-09-01",
    graduationDate: "2025-06-30",
  },
];
