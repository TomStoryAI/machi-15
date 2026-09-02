---
type: Data Model
title: D1 data model
description: boards, posts, comments tables — draft from design part 1.
status: draft
---

# D1 data model

## boards

`id`, `name`, `location`, `admin_password_hash`, `created_at`

## posts

`id`, `board_id`, `category`, `title`, `body`, `photo_key?`, `contact_phone?`, `contact_email?`, `contact_whatsapp?`, `contact_instagram?`, `contact_address?`, `duration_weeks`, `status`, `expires_at`, `mgmt_token_hash`, `created_at`, `approved_at`

* `status`: `pending | live | rejected | expired`
* `duration_weeks`: 1 or 2
* `photo_key`: R2 object key, nullable (text-only ads)
* `mgmt_token_hash`: management token stored hashed — anonymous poster management (view comments / delete)

## comments

`id`, `post_id`, `body`, `status`, `created_at`

* `status`: `pending | live | rejected` (comments go through the same approval queue)

## Notes

* Multi-board via `board_id` from day 1; MVP runs a single board.
* Contact fields map 1:1 to the Miro examples (phone, WhatsApp, email, Instagram, address).

## Related

* [Components](components.md)
* [Open questions](open-questions.md)
