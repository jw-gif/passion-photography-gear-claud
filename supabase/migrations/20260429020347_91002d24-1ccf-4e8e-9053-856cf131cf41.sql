
-- Insert Karis Fletcher's 30-day onboarding plan: timeline milestones + checklist
DO $$
DECLARE
  v_hire uuid := '5c8c1554-1793-4c4c-8207-56ae179541df';
BEGIN

INSERT INTO public.onboarding_hire_timeline (hire_id, day_offset, label, title, description, sort_order) VALUES
(v_hire, 0, 'Day 1 · Mon', 'Welcome & orientation', 'Welcome meeting with HR + Tech team. Office tour at 515 with intros to creative, support, and ministry teams. Connect with Chaise + Evan. Team Lunch with Design Team. Set up logins (Canto, Connect, Planning Center, DH Slack, Adobe Creative Cloud). Receive and review Photography Team docs, US> Book, and culture documents.', 1),
(v_hire, 1, 'Day 2 · Tue', 'Systems deep-dive & Cumberland', 'Continued intro to Connect, Planning Center, Slack channels. Canto tour: folder structure, naming conventions, upload process. Begin learning the Door Holder roster — names, skill levels, availability. Review existing Sunday scheduling templates. Cumberland tour and PWA setup.', 2),
(v_hire, 2, 'Day 3 · Wed', 'Shadow Jacob mid-week', 'Shadow Jacob through a typical mid-week workflow. Tour backspace and photography gear storage. Review previous Door Holder onboarding materials to understand the recruitment + onboarding pipeline. Shadow Jacob during podcast photos; intro to Shelley and the Grove Team.', 3),
(v_hire, 3, 'Day 4 · Thu', 'Team Day', 'Full-day Team Day — engage fully. This is a key culture and relationship-building opportunity. Introduce yourself to as many team members across departments as possible. Note cross-departmental contacts who will be relevant to photography coordination.', 4),
(v_hire, 5, 'Day 6 · Sat', 'US> Night', 'Assist with photography coverage at US> Night.', 5),

-- Week 2
(v_hire, 6, 'Day 7 · Sun', 'Trilith Sunday', 'Shadow and shoot alongside Jacob at Trilith. Meet and connect with Trilith Door Holders.', 6),
(v_hire, 7, 'Day 8 · Mon', 'Out of office', 'Flex day from US> conference and PWA.', 7),
(v_hire, 8, 'Day 9 · Tue', 'Sync with Chaise & Sunday channels', 'Morning sync with Chaise. Begin a living questions-and-processes document — write down what you want to learn. Review the full event calendar through April; flag any photography coverage gaps to Chaise. Have coffee/lunch with a staff or DH Point. Connect with Evan to create Sunday Slack channels and communicate shot list and assignments to Door Holders.', 8),
(v_hire, 9, 'Day 10 · Wed', 'Sunday gear prep & DH comms', 'Check in with Chaise — share the week''s progress and any open questions. Begin gear prep for Sunday: clean, charge, and organize house and rental gear. Review Canto for new uploads and finish organizing US> Night photos. Draft Sunday Door Holder communications with clear expectations and logistics.', 9),
(v_hire, 10, 'Day 11 · Thu', 'Out of office', 'Pre-approved day off.', 10),

-- Week 3
(v_hire, 13, 'Day 14 · Sun', 'Out of office', 'Pre-approved day off.', 11),
(v_hire, 14, 'Day 15 · Mon', 'Easter planning kickoff', 'Team sync and debrief last week with Chaise. Continue Easter coverage planning — Door Holders needed, locations, gathering times. Review past Easter photography coverage to understand scale and expectations.', 12),
(v_hire, 15, 'Day 16 · Tue', 'Easter assignments & gear', 'Send Easter assignments to Door Holders with clear expectations and arrival times. Confirm all gear needs for Easter — house gear plus any rental additions. Place rental gear orders if needed; confirm pickup or delivery timeline.', 13),
(v_hire, 16, 'Day 17 · Wed', 'Easter shot list & gear audit', 'Align with Chaise and Design Team on shot list / coverage priorities for Easter gatherings. Create Slack channels and send Easter shot list and assignments to Door Holders. Full gear audit — everything for Easter identified, rented, and staged. Set up Canto for clean post-event ingestion.', 14),
(v_hire, 17, 'Day 18 · Thu', 'Easter final confirmations', 'Send final Easter confirmation to all Door Holders with logistics, parking, and points of contact. End-of-week check-in — everything locked before the weekend; raise any unresolved issues now.', 15),
(v_hire, 19, 'Day 20 · Sat', 'Easter Saturday', 'EASTER WEEKEND BEGINS. Meet team and shadow/serve with point at CBL/515. Be available as the primary point of contact for all Door Holders. Capture photography coverage as assigned. Approve photos on Canto.', 16),
(v_hire, 20, 'Day 21 · Sun', 'Easter Sunday', 'EASTER SUNDAY. Lead capturing at 515 or CBL. Handle any real-time issues. Approve photos on Canto. After gatherings — begin photo ingestion; acknowledge and personally thank every Door Holder.', 17),

-- Week 4
(v_hire, 22, 'Day 23 · Mon', 'Office closed', 'Easter Monday — office closed.', 18),
(v_hire, 23, 'Day 24 · Tue', 'Easter debrief & delivery', 'Photo Team Sync. Easter debrief with Jacob — wins, growth areas, team observations. Complete Easter photo delivery into Canto: culling, tagging, organization. Send personal thank-you messages to every Door Holder who served Easter weekend. Identify gear that needs cleaning, repair, or return. Draft one process improvement idea based on what you learned.', 19),
(v_hire, 24, 'Day 25 · Wed', 'Prep 30-day reflection', 'Complete your questions documentation with Jacob. Write your 30-day reflection — wins, challenges, surprises, what you''d do differently. Identify 3 specific goals for your next 30 days. Document any remaining knowledge gaps to address with Jacob. Prepare talking points for the 30-day review meeting.', 20),
(v_hire, 25, 'Day 26 · Thu', '30-day review', '30-DAY REVIEW MEETING with Jacob — celebrate wins, discuss 60/90-day growth areas. Align on priorities, rhythm, and expectations for the next phase. Share your questions document, process improvement idea, and 30-day reflection. Send out shot lists and assignments for Sunday.', 21),
(v_hire, 27, 'Day 28 · Sun', 'First independent Sunday', 'Full independent Sunday. Coordinate Door Holders, manage gear, capture photos. Take a moment to recognize how much you navigated in your first 30 days.', 22);

-- Checklist organized by week
INSERT INTO public.onboarding_hire_checklist (hire_id, section, label, owner, sort_order) VALUES
-- Week 1: Orient & Connect
(v_hire, 'Week 1 · Orient & Connect', 'Welcome meeting with HR + Tech team', 'HR', 1),
(v_hire, 'Week 1 · Orient & Connect', 'Office tour at 515 with team intros', 'Jacob', 2),
(v_hire, 'Week 1 · Orient & Connect', 'Connect with Chaise and Evan', 'Jacob', 3),
(v_hire, 'Week 1 · Orient & Connect', 'Team Lunch with Design Team', 'Jacob', 4),
(v_hire, 'Week 1 · Orient & Connect', 'Set up logins: Canto, Connect, Planning Center, DH Slack, Adobe CC', 'Tech', 5),
(v_hire, 'Week 1 · Orient & Connect', 'Review Photography Team docs, US> Book, culture documents', 'Karis', 6),
(v_hire, 'Week 1 · Orient & Connect', 'Canto tour: folder structure, naming, upload process', 'Jacob', 7),
(v_hire, 'Week 1 · Orient & Connect', 'Start learning Door Holder roster (names, skills, availability)', 'Karis', 8),
(v_hire, 'Week 1 · Orient & Connect', 'Review Sunday scheduling templates', 'Karis', 9),
(v_hire, 'Week 1 · Orient & Connect', 'Cumberland tour and PWA setup', 'Jacob', 10),
(v_hire, 'Week 1 · Orient & Connect', 'Shadow Jacob in a mid-week workflow', 'Jacob', 11),
(v_hire, 'Week 1 · Orient & Connect', 'Tour backspace and photography gear storage', 'Jacob', 12),
(v_hire, 'Week 1 · Orient & Connect', 'Review Door Holder onboarding & recruitment pipeline', 'Karis', 13),
(v_hire, 'Week 1 · Orient & Connect', 'Shadow podcast photos; meet Shelley and Grove Team', 'Jacob', 14),
(v_hire, 'Week 1 · Orient & Connect', 'Engage fully at Team Day (Thu)', 'Karis', 15),
(v_hire, 'Week 1 · Orient & Connect', 'Cover US> Night photography (Sat)', 'Karis', 16),

-- Week 2
(v_hire, 'Week 2 · Semi-Independent Operation', 'Shadow & shoot alongside Jacob at Trilith Sunday', 'Karis', 17),
(v_hire, 'Week 2 · Semi-Independent Operation', 'Meet Trilith Door Holders', 'Karis', 18),
(v_hire, 'Week 2 · Semi-Independent Operation', 'Morning sync with Chaise', 'Chaise', 19),
(v_hire, 'Week 2 · Semi-Independent Operation', 'Start a living questions & processes document', 'Karis', 20),
(v_hire, 'Week 2 · Semi-Independent Operation', 'Review event calendar through April; flag coverage gaps', 'Karis', 21),
(v_hire, 'Week 2 · Semi-Independent Operation', 'Coffee or lunch with a staff or DH Point', 'Karis', 22),
(v_hire, 'Week 2 · Semi-Independent Operation', 'Create Sunday Slack channels with Evan', 'Evan', 23),
(v_hire, 'Week 2 · Semi-Independent Operation', 'Send shot list & assignments to Door Holders', 'Karis', 24),
(v_hire, 'Week 2 · Semi-Independent Operation', 'Mid-week check-in with Chaise', 'Chaise', 25),
(v_hire, 'Week 2 · Semi-Independent Operation', 'Sunday gear prep: clean, charge, organize house & rentals', 'Karis', 26),
(v_hire, 'Week 2 · Semi-Independent Operation', 'Organize US> Night photos in Canto', 'Karis', 27),
(v_hire, 'Week 2 · Semi-Independent Operation', 'Draft Sunday Door Holder communications', 'Karis', 28),

-- Week 3: Easter
(v_hire, 'Week 3 · Easter Prep & Execute', 'Team sync + last-week debrief with Chaise', 'Chaise', 29),
(v_hire, 'Week 3 · Easter Prep & Execute', 'Plan Easter coverage: Door Holders, locations, times', 'Karis', 30),
(v_hire, 'Week 3 · Easter Prep & Execute', 'Review past Easter photography coverage', 'Karis', 31),
(v_hire, 'Week 3 · Easter Prep & Execute', 'Send Easter assignments to Door Holders', 'Karis', 32),
(v_hire, 'Week 3 · Easter Prep & Execute', 'Confirm all Easter gear needs (house + rentals)', 'Karis', 33),
(v_hire, 'Week 3 · Easter Prep & Execute', 'Place rental gear orders; confirm pickup/delivery', 'Karis', 34),
(v_hire, 'Week 3 · Easter Prep & Execute', 'Align with Chaise & Design Team on Easter shot list', 'Chaise', 35),
(v_hire, 'Week 3 · Easter Prep & Execute', 'Create Easter Slack channels & send shot list', 'Karis', 36),
(v_hire, 'Week 3 · Easter Prep & Execute', 'Full Easter gear audit — everything staged', 'Karis', 37),
(v_hire, 'Week 3 · Easter Prep & Execute', 'Set up Canto for clean post-event ingestion', 'Karis', 38),
(v_hire, 'Week 3 · Easter Prep & Execute', 'Send final Easter confirmation to all Door Holders', 'Karis', 39),
(v_hire, 'Week 3 · Easter Prep & Execute', 'End-of-week check-in — surface unresolved issues', 'Karis', 40),
(v_hire, 'Week 3 · Easter Prep & Execute', 'Easter Saturday: serve point at CBL/515; capture coverage', 'Karis', 41),
(v_hire, 'Week 3 · Easter Prep & Execute', 'Approve Easter Saturday photos in Canto', 'Karis', 42),
(v_hire, 'Week 3 · Easter Prep & Execute', 'Easter Sunday: lead capture at 515 or CBL', 'Karis', 43),
(v_hire, 'Week 3 · Easter Prep & Execute', 'Begin Easter photo ingestion; thank every Door Holder', 'Karis', 44),

-- Week 4: Own & Execute
(v_hire, 'Week 4 · Own & Execute', 'Photo Team Sync', 'Jacob', 45),
(v_hire, 'Week 4 · Own & Execute', 'Easter debrief with Jacob', 'Jacob', 46),
(v_hire, 'Week 4 · Own & Execute', 'Complete Easter photo delivery: cull, tag, organize in Canto', 'Karis', 47),
(v_hire, 'Week 4 · Own & Execute', 'Send personal thank-yous to every Easter Door Holder', 'Karis', 48),
(v_hire, 'Week 4 · Own & Execute', 'Identify gear needing cleaning, repair, or return', 'Karis', 49),
(v_hire, 'Week 4 · Own & Execute', 'Draft one process-improvement idea from Easter', 'Karis', 50),
(v_hire, 'Week 4 · Own & Execute', 'Complete questions documentation with Jacob', 'Karis', 51),
(v_hire, 'Week 4 · Own & Execute', 'Write 30-day reflection (wins, challenges, surprises)', 'Karis', 52),
(v_hire, 'Week 4 · Own & Execute', 'Identify 3 specific goals for the next 30 days', 'Karis', 53),
(v_hire, 'Week 4 · Own & Execute', 'Document remaining knowledge gaps for Jacob', 'Karis', 54),
(v_hire, 'Week 4 · Own & Execute', 'Prepare talking points for 30-day review', 'Karis', 55),
(v_hire, 'Week 4 · Own & Execute', '30-day review meeting with Jacob', 'Jacob', 56),
(v_hire, 'Week 4 · Own & Execute', 'Send Sunday shot lists & assignments', 'Karis', 57),
(v_hire, 'Week 4 · Own & Execute', 'Run first fully independent Sunday', 'Karis', 58);

END $$;
