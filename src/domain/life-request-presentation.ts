import type { LifeRequestPlan } from "./life-request";

const namingFactKeys = new Set(["child.name", "person.name", "business.name", "vehicle.makeModel", "move.label"]);

function answerLabel(question: LifeRequestPlan["questions"][number], rawValue: string) {
  if (question.input === "choice") return question.choices?.find((choice) => choice.value === rawValue)?.label ?? rawValue;
  if (question.input !== "date") return rawValue;
  const parsed = new Date(`${rawValue}T00:00:00Z`);
  return Number.isNaN(parsed.valueOf())
    ? rawValue
    : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(parsed);
}

export function presentLifeRequest(plan: LifeRequestPlan, answers: Record<string, string>) {
  return plan.subjects.map((subject) => {
    const questions = plan.questions.filter((question) => question.subjectRef === subject.ref);
    const nameQuestion = questions.find((question) => namingFactKeys.has(question.factKey));
    const displayName = nameQuestion ? answers[nameQuestion.id]?.trim() || subject.displayName : subject.displayName;
    return {
      ...subject,
      displayName,
      details: questions.flatMap((question) => {
        const value = answers[question.id]?.trim();
        return value ? [{ id: question.id, label: question.label, value: answerLabel(question, value) }] : [];
      }),
    };
  });
}

export function approvalHeading(plan: LifeRequestPlan, answers: Record<string, string>) {
  const names = presentLifeRequest(plan, answers).map((subject, index) => index === 0 && subject.displayName.startsWith("Your ")
    ? `your ${subject.displayName.slice(5)}`
    : subject.displayName);
  const subjectNames = names.length <= 3
    ? new Intl.ListFormat("en-IN", { style: "long", type: "conjunction" }).format(names)
    : `${names.slice(0, 2).join(", ")} and ${names.length - 2} others`;
  return plan.subjects.length === 1
    ? `Add ${subjectNames} and organise ${plan.needs.length} ${plan.needs.length === 1 ? "service" : "services"}`
    : `Add ${subjectNames}`;
}

export function lifeRequestDestination(subjectEntityIds: string[]) {
  const uniqueIds = [...new Set(subjectEntityIds.filter(Boolean))];
  if (uniqueIds.length === 1) return `/life/${encodeURIComponent(uniqueIds[0]!)}`;
  const params = new URLSearchParams();
  for (const id of uniqueIds) params.append("subject", id);
  return `/life/added?${params.toString()}`;
}
