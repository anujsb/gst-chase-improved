// src/lib/validators.ts
export function validateGSTIN(gstin: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.toUpperCase());
}

export const GST_STATES: Record<string,string> = {
  "01":"Jammu & Kashmir",  "02":"Himachal Pradesh", "03":"Punjab",
  "04":"Chandigarh",       "05":"Uttarakhand",      "06":"Haryana",
  "07":"Delhi",            "08":"Rajasthan",         "09":"Uttar Pradesh",
  "10":"Bihar",            "11":"Sikkim",            "12":"Arunachal Pradesh",
  "13":"Nagaland",         "14":"Manipur",           "15":"Mizoram",
  "16":"Tripura",          "17":"Meghalaya",         "18":"Assam",
  "19":"West Bengal",      "20":"Jharkhand",         "21":"Odisha",
  "22":"Chhattisgarh",     "23":"Madhya Pradesh",    "24":"Gujarat",
  "25":"Daman & Diu",      "26":"Dadra & NH",        "27":"Maharashtra",
  "29":"Karnataka",        "30":"Goa",               "32":"Kerala",
  "33":"Tamil Nadu",       "34":"Puducherry",        "36":"Telangana",
  "37":"Andhra Pradesh",   "38":"Ladakh",
};