import type { LearnSubject } from "../../api/learn-types";

export interface CourseCollectionPlan {
  title: string;
  description: string;
  isOfficial: boolean;
  matchesCourse: (course: LearnSubject) => boolean;
  sortCourses: (left: LearnSubject, right: LearnSubject) => number;
}

function chapterNumber(course: LearnSubject): number {
  const chapter = course.title.match(
    /(?:chapter|chapters|kapitel)\s+(\d+)/i,
  )?.[1];
  return chapter ? Number(chapter) : Number.MAX_SAFE_INTEGER;
}

function byReferenceNumber(left: LearnSubject, right: LearnSubject): number {
  return (left.reference_number ?? 0) - (right.reference_number ?? 0);
}

export const COURSE_COLLECTION_PLANS: CourseCollectionPlan[] = [
  {
    title: "Art of Electronics",
    description: "Structured courses based on The Art of Electronics.",
    isOfficial: true,
    matchesCourse: (course) =>
      course.title.includes("The Art of Electronics") ||
      course.title.includes("Die Kunst der Elektronik"),
    sortCourses: (left, right) => {
      const chapterDifference = chapterNumber(left) - chapterNumber(right);
      return chapterDifference || byReferenceNumber(left, right);
    },
  },
  {
    title: "Artificial Intelligence",
    description:
      "Structured courses on artificial intelligence and its practical applications.",
    isOfficial: true,
    matchesCourse: (course) =>
      course.title.includes("AI") ||
      course.title.startsWith("KI-") ||
      course.title.includes("Transformers in LLMs"),
    sortCourses: byReferenceNumber,
  },
  {
    title: "Industrial Power and Machine Control",
    description:
      "Conceptual structured courses about industrial power and machine control.",
    isOfficial: false,
    matchesCourse: (course) =>
      course.title.includes("Industrial Power and Machine Control") ||
      course.title.includes("Industrieleistung und Maschinensteuerung"),
    sortCourses: byReferenceNumber,
  },
];
