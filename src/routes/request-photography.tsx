import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Camera, Check, ArrowLeft, Receipt, AlertCircle, Wrench } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  COMPANIES,
  PCC_TEAMS,
  EVENT_LOCATIONS,
  COVERAGE_TYPES,
  REQUEST_TYPES,
  PHOTO_RATE_CARD,
  type RequestType,
  type CoverageType,
} from "@/lib/orgs";

export const Route = createFileRoute("/request-photography")({
  head: () => ({
    meta: [
      { title: "Photography Team Request · Passion" },
      {
        name: "description",
        content:
          "Submit a request for the Passion Photography team — bookings, shot list additions, and photoshoots.",
      },
    ],
  }),
  component: RequestPhotographyPage,
});

const schema = z
  .object({
    company: z.string().min(1, "Required"),
    team: z.string().optional(),
    firstName: z.string().trim().min(1, "Required").max(100),
    lastName: z.string().trim().min(1, "Required").max(100),
    email: z.string().trim().email("Invalid email").max(255),
    requestTypes: z.array(z.string()).min(1, "Choose at least one"),
    eventName: z.string().trim().max(200).optional(),
    eventLocation: z.string().optional(),
    eventDate: z.date().optional(),
    spansMultipleDays: z.boolean(),
    eventEndDate: z.date().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    contactName: z.string().trim().max(100).optional(),
    contactPhone: z.string().trim().max(30).optional(),
    coverageTypes: z.array(z.string()),
    coverageOther: z.string().trim().max(500).optional(),
    budget: z.string().trim().max(200).optional(),
    concurApprover: z.string().trim().max(200).optional(),
    concurCompany: z.string().trim().max(200).optional(),
    concurClass: z.string().trim().max(200).optional(),
    concurDepartment: z.string().trim().max(200).optional(),
    concurExpenseCategory: z.string().trim().max(200).optional(),
    concurProject: z.string().trim().max(200).optional(),
    concurPeopleResource: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(4000).optional(),
  })
  .refine(
    (v) =>
      v.company !== "Passion City Church" || (v.team && v.team.length > 0),
    { path: ["team"], message: "Required for Passion City Church" }
  );

function RequestPhotographyPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const maxMissingRef = useRef(0);

  const [company, setCompany] = useState<string>("");
  const [team, setTeam] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);

  const [eventName, setEventName] = useState("");
  const [eventLocation, setEventLocation] = useState<string>("");
  const [eventDate, setEventDate] = useState<Date | undefined>();
  const [spansMultipleDays, setSpansMultipleDays] = useState(false);
  const [eventEndDate, setEventEndDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [contactSameAsRequester, setContactSameAsRequester] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [coverageTypes, setCoverageTypes] = useState<CoverageType[]>([]);
  const [coverageOther, setCoverageOther] = useState("");

  const [budget, setBudget] = useState("");
  const [concurApprover, setConcurApprover] = useState("");
  const [concurCompany, setConcurCompany] = useState("");
  const [concurClass, setConcurClass] = useState("");
  const [concurDepartment, setConcurDepartment] = useState("");
  const [concurExpenseCategory, setConcurExpenseCategory] = useState("");
  const [concurProject, setConcurProject] = useState("");
  const [concurPeopleResource, setConcurPeopleResource] = useState("");

  const [notes, setNotes] = useState("");

  const showPccTeam = company === "Passion City Church";
  const showEventDetails = useMemo(
    () => requestTypes.includes("photography_team"),
    [requestTypes]
  );
  const showShotListNotes = requestTypes.includes("shot_list_addition");

  // When "same as requester" is on, mirror name/phone-less contact info from
  // requester. Phone stays manual since there's no requester phone field.
  useEffect(() => {
    if (contactSameAsRequester) {
      setContactName(`${firstName} ${lastName}`.trim());
    }
  }, [contactSameAsRequester, firstName, lastName]);

  function toggleRequestType(t: RequestType) {
    setRequestTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  function toggleCoverage(c: CoverageType) {
    setCoverageTypes((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  // Live-computed list of missing required fields for the sticky bar.
  const missingFields = useMemo(() => {
    const m: string[] = [];
    if (!company) m.push("Team");
    if (showPccTeam && !team) m.push("PCC sub-team");
    if (!firstName.trim()) m.push("First name");
    if (!lastName.trim()) m.push("Last name");
    if (!email.trim()) m.push("Email");
    if (requestTypes.length === 0) m.push("Request type");
    if (showEventDetails) {
      if (!eventName.trim()) m.push("Event name");
      if (!eventLocation) m.push("Event location");
      if (!eventDate) m.push("Event date");
      if (!startTime) m.push("Start time");
      if (!endTime) m.push("End time");
      if (!contactName.trim()) m.push("On-site contact name");
      if (!contactPhone.trim()) m.push("On-site contact phone");
      if (coverageTypes.length === 0) m.push("Coverage type");
      if (coverageTypes.includes("other") && !coverageOther.trim())
        m.push("Coverage other");
      if (!budget.trim()) m.push("Budget");
      if (!concurApprover.trim()) m.push("Concur Budget Approver");
      if (!concurCompany.trim()) m.push("Concur Company");
      if (!concurClass.trim()) m.push("Concur Class");
      if (!concurDepartment.trim()) m.push("Concur Department");
      if (!concurExpenseCategory.trim()) m.push("Concur Expense Category");
      if (!concurProject.trim()) m.push("Concur Project");
      if (!concurPeopleResource.trim()) m.push("Concur People/Resource Type");
    }
    return m;
  }, [
    company,
    team,
    showPccTeam,
    firstName,
    lastName,
    email,
    requestTypes,
    showEventDetails,
    eventName,
    eventLocation,
    eventDate,
    startTime,
    endTime,
    contactName,
    contactPhone,
    coverageTypes,
    coverageOther,
    budget,
    concurApprover,
    concurCompany,
    concurClass,
    concurDepartment,
    concurExpenseCategory,
    concurProject,
    concurPeopleResource,
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = schema.safeParse({
      company,
      team: showPccTeam ? team : undefined,
      firstName,
      lastName,
      email,
      requestTypes,
      eventName: eventName || undefined,
      eventLocation: eventLocation || undefined,
      eventDate,
      spansMultipleDays,
      eventEndDate,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      contactName: contactName || undefined,
      contactPhone: contactPhone || undefined,
      coverageTypes,
      coverageOther: coverageOther || undefined,
      budget: budget || undefined,
      concurApprover: concurApprover || undefined,
      concurCompany: concurCompany || undefined,
      concurClass: concurClass || undefined,
      concurDepartment: concurDepartment || undefined,
      concurExpenseCategory: concurExpenseCategory || undefined,
      concurProject: concurProject || undefined,
      concurPeopleResource: concurPeopleResource || undefined,
      notes: notes || undefined,
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      toast.error(firstError?.message ?? "Please complete required fields");
      return;
    }

    if (missingFields.length > 0) {
      toast.error(`Still needed: ${missingFields.slice(0, 3).join(", ")}${missingFields.length > 3 ? "…" : ""}`);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("photo_requests").insert({
      company,
      team: showPccTeam ? team : null,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      request_types: requestTypes,
      event_name: eventName || null,
      event_location: eventLocation || null,
      event_date: eventDate ? format(eventDate, "yyyy-MM-dd") : null,
      spans_multiple_days: spansMultipleDays,
      event_end_date:
        spansMultipleDays && eventEndDate
          ? format(eventEndDate, "yyyy-MM-dd")
          : null,
      start_time: startTime || null,
      end_time: endTime || null,
      on_site_contact_name: contactName || null,
      on_site_contact_phone: contactPhone || null,
      coverage_types: coverageTypes,
      coverage_other: coverageOther || null,
      budget: budget || null,
      concur_budget_approver: concurApprover || null,
      concur_company: concurCompany || null,
      concur_class: concurClass || null,
      concur_department: concurDepartment || null,
      concur_expense_category: concurExpenseCategory || null,
      concur_project: concurProject || null,
      concur_people_resource_type: concurPeopleResource || null,
      notes: notes || null,
    });
    setSubmitting(false);

    if (error) {
      toast.error(`Submit failed: ${error.message}`);
      return;
    }
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setSubmitted(false);
    setRequestTypes([]);
    setEventName("");
    setEventDate(undefined);
    setEventEndDate(undefined);
    setSpansMultipleDays(false);
    setStartTime("");
    setEndTime("");
    setContactName("");
    setContactPhone("");
    setContactSameAsRequester(false);
    setCoverageTypes([]);
    setCoverageOther("");
    setBudget("");
    setConcurApprover("");
    setConcurCompany("");
    setConcurClass("");
    setConcurDepartment("");
    setConcurExpenseCategory("");
    setConcurProject("");
    setConcurPeopleResource("");
    setNotes("");
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mx-auto size-14 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Check className="size-7" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Request submitted
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Thanks{firstName ? `, ${firstName}` : ""}! The Photography team will
            review your request and follow up by email at{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button asChild variant="outline">
              <Link to="/">Back home</Link>
            </Button>
            <Button onClick={resetForm}>Submit another</Button>
          </div>
        </Card>
      </main>
    );
  }

  const sectionStep = (n: number) => (
    <span className="inline-flex items-center justify-center size-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">
      {n}
    </span>
  );

  return (
    <main className="min-h-screen bg-background pb-28">
      <header className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <div className="size-8 rounded-full bg-primary flex items-center justify-center">
            <Camera className="size-4" />
          </div>
          <span className="font-semibold tracking-tight group-hover:underline">
            Passion Photography
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link to="/request-gear">
              <Wrench className="size-4" />
              <span className="hidden sm:inline">Request Gear</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight uppercase">
            Photography Team Request
          </h1>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
            Tell us about your event or shoot. The Photography team will review
            and follow up with next steps.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SECTION 1: Who you are */}
          <Section step={sectionStep(1)} title="Tell us about you">
            <Field label="Please tell us what team you're on" required>
              <Select value={company} onValueChange={(v) => { setCompany(v); setTeam(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {showPccTeam && (
              <Field label="Which team are you on?" required>
                <Select value={team} onValueChange={setTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {PCC_TEAMS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First Name" required>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  maxLength={100}
                />
              </Field>
              <Field label="Last Name" required>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  maxLength={100}
                />
              </Field>
            </div>

            <Field label="Email" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                placeholder="you@passioncitychurch.com"
              />
            </Field>
          </Section>

          {/* SECTION 2: Request type */}
          <Section step={sectionStep(2)} title="What do you need?" required>
            <div className="space-y-3">
              {REQUEST_TYPES.map((t) => {
                const checked = requestTypes.includes(t.value);
                return (
                  <label
                    key={t.value}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-foreground/30"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleRequestType(t.value)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{t.label}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {t.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </Section>

          {/* SECTION 3: Event details */}
          {showEventDetails && (
            <Section step={sectionStep(3)} title="Event details">
              <Field label="Event Name" required>
                <Input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  maxLength={200}
                />
              </Field>

              <Field label="Event Location" required>
                <Select value={eventLocation} onValueChange={setEventLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_LOCATIONS.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Event Date" required>
                  <DatePicker date={eventDate} onChange={setEventDate} />
                </Field>
                <div className="flex items-end">
                  <label className="flex items-start gap-2 pb-2 cursor-pointer">
                    <Checkbox
                      checked={spansMultipleDays}
                      onCheckedChange={(v) => setSpansMultipleDays(!!v)}
                      className="mt-0.5"
                    />
                    <span className="text-sm leading-tight">
                      This request spans multiple concurrent days
                    </span>
                  </label>
                </div>
              </div>

              {spansMultipleDays && (
                <Field label="Last day of event">
                  <DatePicker date={eventEndDate} onChange={setEventEndDate} />
                </Field>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Start Time (photographer(s) on site)" required>
                  <TimePicker value={startTime} onChange={setStartTime} />
                </Field>
                <Field label="End Time (photographer(s) released)" required>
                  <TimePicker value={endTime} onChange={setEndTime} />
                </Field>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <Checkbox
                    checked={contactSameAsRequester}
                    onCheckedChange={(v) => setContactSameAsRequester(!!v)}
                  />
                  On-site contact is the same as me
                </label>
                <Field label="On-Site Point of Contact Name" required>
                  <Input
                    value={contactName}
                    onChange={(e) => {
                      setContactSameAsRequester(false);
                      setContactName(e.target.value);
                    }}
                    maxLength={100}
                  />
                </Field>
                <Field label="On-Site Point of Contact Phone" required>
                  <Input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    maxLength={30}
                    placeholder="(555) 555-5555"
                  />
                </Field>
              </div>

              <Field label="What type of coverage are you requesting?" required>
                <div className="space-y-2">
                  {COVERAGE_TYPES.map((c) => {
                    const checked = coverageTypes.includes(c.value);
                    return (
                      <label key={c.value} className="flex items-center gap-3 cursor-pointer">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleCoverage(c.value)}
                        />
                        <span>{c.label}</span>
                      </label>
                    );
                  })}
                </div>
                {coverageTypes.includes("other") && (
                  <Input
                    className="mt-3"
                    placeholder="Describe other coverage type"
                    value={coverageOther}
                    onChange={(e) => setCoverageOther(e.target.value)}
                    maxLength={500}
                  />
                )}
              </Field>
            </Section>
          )}

          {/* Shot list notes */}
          {showShotListNotes && (
            <Section step={sectionStep(showEventDetails ? 4 : 3)} title="Shot list details">
              <Field label="Describe the shots you'd like added">
                <Textarea
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={4000}
                  placeholder="e.g. wide shot of the worship team during the bridge of the closing song; candid of leadership greeting people in the lobby; etc."
                />
              </Field>
            </Section>
          )}

          {/* Budget + Concur */}
          {showEventDetails && (
            <Section
              step={sectionStep(showShotListNotes ? 5 : 4)}
              title="Budget & expensing"
            >
              <Field label="What is your budget?" required>
                <BudgetPicker value={budget} onChange={setBudget} />
              </Field>

              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                <Receipt className="size-5 text-muted-foreground shrink-0" />
                <div className="text-sm text-muted-foreground">
                  Concur accounting details — required so we can bill the shoot
                  to the correct budget.
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <Field label="Concur Budget Approver" required>
                  <Input
                    value={concurApprover}
                    onChange={(e) => setConcurApprover(e.target.value)}
                    maxLength={200}
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Company" required>
                    <Input
                      value={concurCompany}
                      onChange={(e) => setConcurCompany(e.target.value)}
                      maxLength={200}
                    />
                  </Field>
                  <Field label="Class" required>
                    <Input
                      value={concurClass}
                      onChange={(e) => setConcurClass(e.target.value)}
                      maxLength={200}
                    />
                  </Field>
                  <Field label="Department" required>
                    <Input
                      value={concurDepartment}
                      onChange={(e) => setConcurDepartment(e.target.value)}
                      maxLength={200}
                    />
                  </Field>
                  <Field label="Expense Category" required>
                    <Input
                      value={concurExpenseCategory}
                      onChange={(e) => setConcurExpenseCategory(e.target.value)}
                      maxLength={200}
                    />
                  </Field>
                  <Field label="Project" required>
                    <Input
                      value={concurProject}
                      onChange={(e) => setConcurProject(e.target.value)}
                      maxLength={200}
                    />
                  </Field>
                  <Field label="People/Resource Type" required>
                    <Input
                      value={concurPeopleResource}
                      onChange={(e) => setConcurPeopleResource(e.target.value)}
                      maxLength={200}
                    />
                  </Field>
                </div>
              </div>
            </Section>
          )}
        </form>
      </div>

      {/* Sticky bottom validation + submit bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {(() => {
          if (missingFields.length > maxMissingRef.current) {
            maxMissingRef.current = missingFields.length;
          }
          const pct = maxMissingRef.current === 0
            ? 100
            : Math.round(((maxMissingRef.current - missingFields.length) / maxMissingRef.current) * 100);
          return (
            <div className="h-1 bg-border">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          );
        })()}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 justify-between">
          <div className="text-sm min-w-0 flex items-center gap-2">
            {missingFields.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <Check className="size-4" /> Ready to submit
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground truncate">
                <AlertCircle className="size-4 shrink-0 text-amber-500" />
                <span className="truncate">
                  <span className="font-medium text-foreground">{missingFields.length}</span> required
                  {missingFields.length === 1 ? " field" : " fields"} missing
                  <span className="hidden sm:inline">
                    {": "}
                    <span className="text-foreground/70">
                      {missingFields.slice(0, 2).join(", ")}
                      {missingFields.length > 2 && "…"}
                    </span>
                  </span>
                </span>
              </span>
            )}
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={submitting || missingFields.length > 0}
            onClick={(e) => {
              const form = (e.currentTarget.closest("main")?.querySelector("form") ?? null) as HTMLFormElement | null;
              if (form) form.requestSubmit();
            }}
          >
            {submitting ? "Submitting…" : "Submit request"}
          </Button>
        </div>
      </div>
    </main>
  );
}

function Section({
  step,
  title,
  required,
  children,
}: {
  step?: React.ReactNode;
  title: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        {step}
        <h2 className="text-lg font-semibold tracking-tight">
          {title}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </h2>
      </div>
      {children}
    </Card>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

function DatePicker({
  date,
  onChange,
}: {
  date: Date | undefined;
  onChange: (d: Date | undefined) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="size-4 mr-2" />
          {date ? format(date, "PPP") : "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onChange}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Generates HH:mm options in 15-minute increments across the day. */
const TIME_OPTIONS: { value: string; label: string }[] = (() => {
  const out: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      const value = `${hh}:${mm}`;
      const period = h < 12 ? "AM" : "PM";
      const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${display}:${mm} ${period}`;
      out.push({ value, label });
    }
  }
  return out;
})();

function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const v = value ? value.slice(0, 5) : "";
  return (
    <Select value={v} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a time" />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {TIME_OPTIONS.map((t) => (
          <SelectItem key={t.value} value={t.value}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BudgetPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const presetValues: string[] = PHOTO_RATE_CARD.map((t) => t.label);
  const isPreset = presetValues.includes(value);
  const isOther = value !== "" && !isPreset;
  const [otherAmount, setOtherAmount] = useState(isOther ? value.replace(/^\$/, "") : "");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch">
        {PHOTO_RATE_CARD.map((tier) => {
          const selected = value === tier.label;
          return (
            <button
              key={tier.amount}
              type="button"
              onClick={() => onChange(tier.label)}
              className={cn(
                "flex h-full flex-col text-left rounded-lg border overflow-hidden transition-colors",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-foreground/30"
              )}
            >
              <div className="px-4 py-3 border-b bg-muted/40">
                <div className="text-xl font-bold tracking-tight leading-none">
                  {tier.label}
                </div>
              </div>
              <ul className="flex-1 px-4 py-3 space-y-0.5 text-xs text-muted-foreground">
                {tier.examples.map((ex) => (
                  <li key={ex}>• {ex}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          if (!isOther) {
            const next = otherAmount ? `$${otherAmount}` : "";
            onChange(next || "$");
            if (!next) setOtherAmount("");
          }
        }}
        className={cn(
          "w-full text-left rounded-lg border p-3 transition-colors",
          isOther
            ? "border-primary bg-primary/5 ring-1 ring-primary"
            : "border-border hover:border-foreground/30"
        )}
      >
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm">Other</span>
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-muted-foreground text-sm">$</span>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="1"
              value={otherAmount}
              placeholder="0"
              onChange={(e) => {
                const v = e.target.value;
                setOtherAmount(v);
                onChange(v ? `$${v}` : "");
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-9 w-32"
            />
          </div>
        </div>
      </button>
    </div>
  );
}
