# Database Schema

## User
- name, email, password, role (admin | area_manager | dealer)
- status (active | inactive)
- areaManagerRef, dealerRef (optional links)

## AreaManager
- employeeId, name, email, mobile, state, district, status
- user (ref to User)

## Dealer
- dealerName, dealerCode, contactPerson, mobile, alternateMobile
- email, address, state, district, city, pincode
- gstNumber, pan, facebookLink, whatsappNumber, language
- areaManager (ref), status, profileImage

## Visit
- dealer, areaManager, visitDate, visitTime, notes
- media[], gpsLocation, status (pending | completed | cancelled)

## Media
- dealer, uploadedBy, type (image | video | document)
- url, description, status (pending | approved | rejected)
- adminComment, visit (optional ref)

## Activity
- entityType, entityId, action, description
- performedBy, metadata

## AuditLog
- user, action, entity, entityId, details
- ipAddress, userAgent

## AssignmentHistory
- dealer, fromAreaManager, toAreaManager
- assignedBy, reason

## Settings
- companyName, companyLogo, companyAddress, companyEmail, companyPhone
- passwordPolicy, theme
