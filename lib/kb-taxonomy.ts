// Knowledge Base taxonomy. Coverage = visa types × categories. Applicant
// profiles and edge cases are driven INSIDE each slice by the prompt (rather
// than as a third loop dimension) to keep the number of generation calls
// manageable while still producing exhaustive, deduplicated output.

export const VISA_TYPES = [
  "Tourist",
  "Business",
  "Student",
  "Work",
  "Family or spouse",
  "Transit",
  "Medical",
  "Conference",
  "Digital nomad",
];

// Surfaced to the model as the profiles to vary questions across.
export const APPLICANT_PROFILES = [
  "salaried employee",
  "self-employed or business owner",
  "student",
  "minor under 18",
  "retired",
  "unemployed or homemaker",
  "frequent traveler",
  "first-time traveler",
  "family or group application",
];

export const CATEGORIES = [
  "Eligibility",
  "Required documents",
  "Fees and payment",
  "Processing time",
  "Appointments and biometrics",
  "Photo specifications",
  "Financial proof and bank statements",
  "Cover letter and itinerary",
  "Travel insurance",
  "Accommodation proof",
  "Validity and duration of stay",
  "Multiple entry",
  "Extensions and renewals",
  "Rejection, refusal and reapplication",
  "Previous rejections and travel history",
  "Passport validity and name mismatch",
  "Minors and parental consent",
  "Transit rules",
  "Overstays and compliance",
  "After approval and collection",
];

export interface Slice {
  visaType: string;
  category: string;
}

/** All visa-type × category slices (the generation work-list). */
export function enumerateSlices(): Slice[] {
  const slices: Slice[] = [];
  for (const visaType of VISA_TYPES) {
    for (const category of CATEGORIES) {
      slices.push({ visaType, category });
    }
  }
  return slices;
}
