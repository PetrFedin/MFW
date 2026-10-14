-- RESEARCH / FORWARD-ONLY CANDIDATE — NOT THE HISTORICAL APP MIGRATION 027.
-- Scratch restored PG17 only. Never apply this to live MFW Supabase/Render.
-- Independent review must attest consumer contracts, existing rows and role grants.
--
-- Historical 027 catalog uniqueness on receipts.event_key makes fanout impossible.
-- Preserve per-consumer (outbox_id,consumer) UNIQUE and outbox FK RESTRICT.
-- Add composite relationship that ensures receipt.event_key belongs to the
-- referenced outbox event, without globally restricting consumer fanout.

ALTER TABLE public.authority_delivery_receipts
  DROP CONSTRAINT IF EXISTS authority_delivery_receipts_event_key_key;

DO $mfw_scoped_receipt$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.authority_outbox'::regclass
      AND conname = 'authority_outbox_id_event_key_key'
  ) THEN
    ALTER TABLE public.authority_outbox
      ADD CONSTRAINT authority_outbox_id_event_key_key
      UNIQUE(id, event_key);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.authority_delivery_receipts'::regclass
      AND conname = 'authority_delivery_receipts_outbox_event_key_fkey'
  ) THEN
    ALTER TABLE public.authority_delivery_receipts
      ADD CONSTRAINT authority_delivery_receipts_outbox_event_key_fkey
      FOREIGN KEY (outbox_id, event_key)
      REFERENCES public.authority_outbox(id, event_key)
      ON DELETE RESTRICT;
  END IF;
END
$mfw_scoped_receipt$;
