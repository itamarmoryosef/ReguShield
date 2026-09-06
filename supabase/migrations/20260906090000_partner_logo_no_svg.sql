-- -----------------------------------------------------------------------------
-- Stop accepting SVG logos.
--
-- partner-logos is a public bucket, so anything in it is fetchable by URL by
-- anyone. An SVG is a document, not a picture: it can carry script and its own
-- markup. Letting partners publish one means letting them host an active page
-- on our storage domain, which is a convincing base for a phishing page aimed
-- at the business owners whose logo they are supposed to be branding.
--
-- Raster formats cannot do any of that, and a logo has no need for anything a
-- raster format lacks.
-- -----------------------------------------------------------------------------
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'partner-logos';
