// src/supabaseRepo.js
import { supabase } from "./supabase"; // your createClient(...) file

/** HOW OWNERSHIP IS ATTACHED
 * We prefer owner_id = auth.uid() for RLS.
 * If you only created owner_email policies, it will still work (fallback).
 */
async function getOwnerFields() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const user = data?.user;
  return {
    owner_id: user?.id || null,
    owner_email: user?.email || null,
    folderKey: user?.id || user?.email || "public",
  };
}

/** Auth helpers */
export async function signInWithMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}
export async function signOut() {
  await supabase.auth.signOut();
}
export function onSessionChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((_evt, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

/** Load everything (RLS returns only your rows) */
export async function loadAll() {
  const [c, i] = await Promise.all([
    supabase.from("customers").select("*").order("created_at", { ascending: true }),
    supabase.from("invoices").select("*").order("created_at", { ascending: true }),
  ]);
  if (c.error) throw c.error;
  if (i.error) throw i.error;
  return { customers: c.data || [], invoices: i.data || [] };
}

/** Generic upsert/insert logic based on presence of id */
async function upsertById(table, payload) {
  if (payload.id) {
    const { data, error } = await supabase.from(table)
      .upsert(payload, { onConflict: "id" })
      .select("*").single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from(table)
      .insert(payload).select("*").single();
    if (error) throw error;
    return data;
  }
}

/** Customers */
export async function saveCustomer(customer) {
  const owner = await getOwnerFields();
  const payload = { ...customer, ...owner };
  return await upsertById("customers", payload);
}
export async function deleteCustomer(id) {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}

/** Invoices */
export async function saveInvoice(invoice) {
  const owner = await getOwnerFields();
  const payload = { ...invoice, ...owner };
  return await upsertById("invoices", payload);
}
export async function deleteInvoice(id) {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
}

/** Storage: PO Images (private bucket recommended) */
export async function uploadPoImage(file, { bucket = "po-images", signForSeconds = 60 * 60 * 24 * 7 } = {}) {
  const { folderKey } = await getOwnerFields();
  const path = `${folderKey}/${crypto.randomUUID?.() || Date.now()}-${file.name}`;
  const up = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (up.error) throw up.error;

  const signed = await supabase.storage.from(bucket).createSignedUrl(path, signForSeconds);
  if (signed.error) throw signed.error;

  return { path, url: signed.data?.signedUrl };
}
export async function getSignedUrl(path, { bucket = "po-images", signForSeconds = 60 * 60 } = {}) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, signForSeconds);
  if (error) throw error;
  return data?.signedUrl;
}
