-- V14: Full Exercise Expansion
-- Fixes critical gap: PULL+DUMBBELL only had 1 exercise (minimum needed = 3)
-- Adds 40 exercises: PULL(10), PUSH(8), LEGS(8), FULL_BODY(6), CORE(5), CARDIO(3)
-- Equipment focus: DUMBBELL + BODYWEIGHT for maximum compatibility

INSERT INTO exercises (
    exercise_name, description, difficulty_level, exercise_type, movement_pattern,
    primary_muscle, secondary_muscles, required_equipment,
    spinal_loading, knee_dominant, shoulder_overhead, high_impact, wrist_loading,
    default_sets, default_reps, default_rest_seconds,
    met_value, force_type, exercise_category,
    rpe_min, rpe_max, tempo,
    suitable_for_senior, suitable_for_overweight, is_bilateral,
    status
) VALUES

-- ═══════════════════════════════════════════════════════════
-- PULL — DUMBBELL (5 exercises — critical gap)
-- ═══════════════════════════════════════════════════════════

('Dumbbell Pullover',
 'Lie on bench or floor, hold one dumbbell overhead and arc it behind the head. Targets lats and chest.',
 'MEDIUM', 'STRENGTH', 'PULL',
 'Latissimus Dorsi', 'Chest,Triceps,Serratus', 'DUMBBELL',
 FALSE, FALSE, FALSE, FALSE, TRUE,
 3, 12, 75, 4.5, 'PULL', 'COMPOUND',
 5, 7, '3-1-1', FALSE, TRUE, TRUE, 'ACTIVE'),

('Dumbbell Rear Delt Fly',
 'Hinge forward at hips, raise dumbbells out to sides with slight bend in elbows. Rear delt isolation.',
 'EASY', 'STRENGTH', 'PULL',
 'Rear Deltoid', 'Rhomboid,Trapezius', 'DUMBBELL',
 FALSE, FALSE, FALSE, FALSE, FALSE,
 3, 15, 60, 3.5, 'PULL', 'ISOLATION',
 4, 6, '2-1-2', TRUE, TRUE, TRUE, 'ACTIVE'),

('Dumbbell Bicep Curl',
 'Standing or seated, curl dumbbell from full extension to full flexion. Classic bicep isolation.',
 'EASY', 'STRENGTH', 'PULL',
 'Biceps', 'Forearms,Brachialis', 'DUMBBELL',
 FALSE, FALSE, FALSE, FALSE, TRUE,
 3, 12, 60, 3.5, 'PULL', 'ISOLATION',
 4, 6, '2-1-2', TRUE, TRUE, FALSE, 'ACTIVE'),

('Dumbbell Hammer Curl',
 'Curl with neutral grip (palms facing each other). Targets brachialis and brachioradialis.',
 'EASY', 'STRENGTH', 'PULL',
 'Brachialis', 'Biceps,Forearms', 'DUMBBELL',
 FALSE, FALSE, FALSE, FALSE, TRUE,
 3, 12, 60, 3.5, 'PULL', 'ISOLATION',
 4, 6, '2-0-2', TRUE, TRUE, FALSE, 'ACTIVE'),

('Incline Dumbbell Row',
 'Lie face-down on incline bench, row dumbbells up toward hips. Strict form with no momentum.',
 'MEDIUM', 'STRENGTH', 'PULL',
 'Upper Back', 'Biceps,Rear Deltoid,Rhomboid', 'DUMBBELL',
 FALSE, FALSE, FALSE, FALSE, FALSE,
 3, 10, 75, 5.0, 'PULL', 'COMPOUND',
 5, 7, '3-1-1', TRUE, TRUE, TRUE, 'ACTIVE'),

-- ═══════════════════════════════════════════════════════════
-- PULL — BODYWEIGHT (3 more for variety beyond V11)
-- ═══════════════════════════════════════════════════════════

('Prone Cobra',
 'Lie face down, lift chest off floor with arms extended, squeezing shoulder blades together.',
 'EASY', 'STRENGTH', 'PULL',
 'Erector Spinae', 'Rear Deltoid,Glutes', 'BODYWEIGHT',
 FALSE, FALSE, FALSE, FALSE, FALSE,
 3, 12, 45, 3.0, 'PULL', 'ISOLATION',
 2, 4, '2-2-1', TRUE, TRUE, TRUE, 'ACTIVE'),

('Table Row',
 'Lie under a sturdy table, grip the edge and pull chest up to it. Inverted row variation.',
 'EASY', 'STRENGTH', 'PULL',
 'Upper Back', 'Biceps,Core', 'BODYWEIGHT',
 FALSE, FALSE, FALSE, FALSE, FALSE,
 3, 10, 60, 5.0, 'PULL', 'COMPOUND',
 3, 5, '3-1-1', TRUE, TRUE, TRUE, 'ACTIVE'),

('Doorway Row',
 'Grip a door frame or fixed bar at waist height, lean back and row body toward hands.',
 'EASY', 'STRENGTH', 'PULL',
 'Latissimus Dorsi', 'Biceps,Rear Deltoid', 'BODYWEIGHT',
 FALSE, FALSE, FALSE, FALSE, FALSE,
 3, 12, 60, 4.5, 'PULL', 'COMPOUND',
 4, 6, '3-0-1', TRUE, TRUE, TRUE, 'ACTIVE'),

-- ═══════════════════════════════════════════════════════════
-- PUSH — DUMBBELL (5 more exercises)
-- ═══════════════════════════════════════════════════════════

('Dumbbell Chest Fly',
 'Lie on bench or floor, open arms wide in arc motion, squeezing chest at top.',
 'MEDIUM', 'STRENGTH', 'PUSH',
 'Chest', 'Front Deltoid,Biceps', 'DUMBBELL',
 FALSE, FALSE, FALSE, FALSE, FALSE,
 3, 12, 75, 4.0, 'PUSH', 'ISOLATION',
 5, 7, '3-0-2', FALSE, TRUE, TRUE, 'ACTIVE'),

('Dumbbell Lateral Raise',
 'Stand and raise dumbbells to sides to shoulder height. Targets medial deltoids.',
 'EASY', 'STRENGTH', 'PUSH',
 'Deltoid', 'Trapezius,Rotator Cuff', 'DUMBBELL',
 FALSE, FALSE, TRUE, FALSE, FALSE,
 3, 15, 60, 3.5, 'PUSH', 'ISOLATION',
 4, 6, '2-1-2', TRUE, TRUE, TRUE, 'ACTIVE'),

('Dumbbell Front Raise',
 'Raise dumbbell forward to eye level, elbows slightly bent. Front deltoid isolation.',
 'EASY', 'STRENGTH', 'PUSH',
 'Front Deltoid', 'Upper Chest,Trapezius', 'DUMBBELL',
 FALSE, FALSE, TRUE, FALSE, FALSE,
 3, 12, 60, 3.0, 'PUSH', 'ISOLATION',
 4, 6, '2-1-2', TRUE, TRUE, FALSE, 'ACTIVE'),

('Dumbbell Tricep Kickback',
 'Hinge forward, upper arm parallel to floor, extend forearm back. Tricep isolation.',
 'EASY', 'STRENGTH', 'PUSH',
 'Triceps', 'Rear Deltoid', 'DUMBBELL',
 FALSE, FALSE, FALSE, FALSE, FALSE,
 3, 12, 60, 3.0, 'PUSH', 'ISOLATION',
 4, 6, '2-1-2', TRUE, TRUE, FALSE, 'ACTIVE'),

('Dumbbell Arnold Press',
 'Start with palms facing body, press up while rotating palms forward. Full shoulder development.',
 'MEDIUM', 'STRENGTH', 'PUSH',
 'Deltoid', 'Triceps,Upper Trapezius', 'DUMBBELL',
 FALSE, FALSE, TRUE, FALSE, FALSE,
 3, 10, 75, 4.5, 'PUSH', 'COMPOUND',
 6, 8, '3-0-1', FALSE, FALSE, TRUE, 'ACTIVE'),

-- ═══════════════════════════════════════════════════════════
-- PUSH — BODYWEIGHT (3 more)
-- ═══════════════════════════════════════════════════════════

('Diamond Push Up',
 'Push up with hands close together forming diamond shape. Emphasizes triceps.',
 'HARD', 'STRENGTH', 'PUSH',
 'Triceps', 'Inner Chest,Front Deltoid', 'BODYWEIGHT',
 FALSE, FALSE, FALSE, FALSE, TRUE,
 3, 8, 75, 6.0, 'PUSH', 'COMPOUND',
 7, 9, '3-0-1', FALSE, FALSE, TRUE, 'ACTIVE'),

('Staggered Push Up',
 'One hand forward, one back — shifts load to one side. Unilateral push variation.',
 'MEDIUM', 'STRENGTH', 'PUSH',
 'Chest', 'Triceps,Core', 'BODYWEIGHT',
 FALSE, FALSE, FALSE, FALSE, TRUE,
 3, 8, 60, 5.5, 'PUSH', 'COMPOUND',
 6, 8, '3-0-1', FALSE, FALSE, FALSE, 'ACTIVE'),

('Archer Push Up',
 'Wide-stance push up that shifts weight to one arm. Progression toward one-arm push up.',
 'HARD', 'STRENGTH', 'PUSH',
 'Chest', 'Triceps,Deltoid', 'BODYWEIGHT',
 FALSE, FALSE, FALSE, FALSE, TRUE,
 3, 6, 75, 6.5, 'PUSH', 'COMPOUND',
 7, 9, '3-1-1', FALSE, FALSE, FALSE, 'ACTIVE'),

-- ═══════════════════════════════════════════════════════════
-- LEGS — DUMBBELL (5 exercises)
-- ═══════════════════════════════════════════════════════════

('Dumbbell Lunge',
 'Step forward into lunge holding dumbbells at sides. Alternating or same leg.',
 'MEDIUM', 'STRENGTH', 'LEGS',
 'Quadriceps', 'Glutes,Hamstrings,Calves', 'DUMBBELL',
 FALSE, TRUE, FALSE, FALSE, FALSE,
 3, 10, 75, 5.5, 'LEGS', 'COMPOUND',
 5, 7, '3-0-1', FALSE, FALSE, FALSE, 'ACTIVE'),

('Dumbbell Split Squat',
 'Stationary split stance squat with dumbbells. More stable than lunge, great for beginners.',
 'EASY', 'STRENGTH', 'LEGS',
 'Quadriceps', 'Glutes,Hamstrings', 'DUMBBELL',
 FALSE, TRUE, FALSE, FALSE, FALSE,
 3, 10, 75, 5.0, 'LEGS', 'COMPOUND',
 4, 6, '3-1-1', TRUE, FALSE, FALSE, 'ACTIVE'),

('Dumbbell Step Up',
 'Hold dumbbells and step onto bench or box, driving knee forward at top.',
 'MEDIUM', 'STRENGTH', 'LEGS',
 'Glutes', 'Quadriceps,Hamstrings', 'DUMBBELL',
 FALSE, TRUE, FALSE, FALSE, FALSE,
 3, 10, 75, 5.5, 'LEGS', 'COMPOUND',
 5, 7, '2-1-1', TRUE, FALSE, FALSE, 'ACTIVE'),

('Dumbbell Sumo Squat',
 'Wide stance squat holding one dumbbell between legs. Inner thigh and glute focus.',
 'EASY', 'STRENGTH', 'LEGS',
 'Glutes', 'Inner Thigh,Quadriceps', 'DUMBBELL',
 FALSE, TRUE, FALSE, FALSE, FALSE,
 3, 12, 60, 5.0, 'LEGS', 'COMPOUND',
 4, 6, '3-1-1', TRUE, TRUE, TRUE, 'ACTIVE'),

('Dumbbell Calf Raise',
 'Stand holding dumbbells, rise onto toes. Can be done bilateral or single-leg.',
 'EASY', 'STRENGTH', 'LEGS',
 'Calves', 'Soleus,Peroneal', 'DUMBBELL',
 FALSE, FALSE, FALSE, FALSE, FALSE,
 3, 20, 45, 3.5, 'LEGS', 'ISOLATION',
 3, 5, '2-1-2', TRUE, TRUE, TRUE, 'ACTIVE'),

-- ═══════════════════════════════════════════════════════════
-- FULL_BODY — DUMBBELL (6 exercises — for full_body session pool)
-- ═══════════════════════════════════════════════════════════

('Dumbbell Thruster',
 'Front squat into overhead press in one fluid motion. High calorie burn, full body.',
 'HARD', 'STRENGTH', 'FULL_BODY',
 'Quadriceps', 'Deltoid,Triceps,Glutes,Core', 'DUMBBELL',
 TRUE, TRUE, TRUE, FALSE, FALSE,
 3, 10, 90, 7.0, 'LEGS', 'COMPOUND',
 7, 9, '1-0-1', FALSE, FALSE, TRUE, 'ACTIVE'),

('Dumbbell Farmer Carry',
 'Walk a set distance holding heavy dumbbells. Full body tension, grip and core.',
 'MEDIUM', 'STRENGTH', 'FULL_BODY',
 'Forearms', 'Trapezius,Core,Legs', 'DUMBBELL',
 TRUE, FALSE, FALSE, FALSE, TRUE,
 3, 30, 60, 5.5, 'CORE', 'COMPOUND',
 5, 7, 'N/A', FALSE, FALSE, TRUE, 'ACTIVE'),

('Dumbbell Deadlift',
 'Hip hinge pulling dumbbells from floor. Compound posterior chain movement.',
 'MEDIUM', 'STRENGTH', 'FULL_BODY',
 'Hamstrings', 'Glutes,Erector Spinae,Trapezius', 'DUMBBELL',
 TRUE, FALSE, FALSE, FALSE, FALSE,
 3, 10, 90, 6.0, 'LEGS', 'COMPOUND',
 6, 8, '3-1-1', FALSE, FALSE, TRUE, 'ACTIVE'),

('Dumbbell Renegade Row',
 'Push-up position with hands on dumbbells, alternate rowing each arm. Core + pull.',
 'HARD', 'STRENGTH', 'FULL_BODY',
 'Upper Back', 'Biceps,Core,Chest', 'DUMBBELL',
 FALSE, FALSE, FALSE, FALSE, TRUE,
 3, 8, 90, 6.5, 'PULL', 'COMPOUND',
 7, 9, '1-2-1', FALSE, FALSE, FALSE, 'ACTIVE'),

('Dumbbell Clean and Press',
 'Pull dumbbell from hip to shoulder (clean) then press overhead. Full body power.',
 'HARD', 'STRENGTH', 'FULL_BODY',
 'Deltoid', 'Quadriceps,Glutes,Trapezius,Core', 'DUMBBELL',
 TRUE, TRUE, TRUE, FALSE, FALSE,
 3, 8, 90, 7.5, 'LEGS', 'COMPOUND',
 7, 9, '1-0-1', FALSE, FALSE, FALSE, 'ACTIVE'),

('Dumbbell Swing',
 'Hip hinge explosive swing of dumbbell from between legs to chest height. Posterior chain power.',
 'MEDIUM', 'STRENGTH', 'FULL_BODY',
 'Glutes', 'Hamstrings,Core,Deltoid', 'DUMBBELL',
 TRUE, FALSE, FALSE, FALSE, FALSE,
 3, 15, 60, 7.0, 'LEGS', 'COMPOUND',
 6, 8, '1-0-1', FALSE, TRUE, TRUE, 'ACTIVE'),

-- ═══════════════════════════════════════════════════════════
-- CORE — DUMBBELL (3 exercises)
-- ═══════════════════════════════════════════════════════════

('Dumbbell Russian Twist',
 'Seated rotation holding dumbbell, targeting obliques with added resistance.',
 'MEDIUM', 'STRENGTH', 'CORE',
 'Obliques', 'Rectus Abdominis,Hip Flexors', 'DUMBBELL',
 FALSE, FALSE, FALSE, FALSE, TRUE,
 3, 20, 45, 4.0, 'CORE', 'ISOLATION',
 5, 7, '1-0-1', FALSE, TRUE, TRUE, 'ACTIVE'),

('Dumbbell Pallof Press',
 'Hold dumbbell at chest, press out and resist rotation. Anti-rotation core stability.',
 'MEDIUM', 'STRENGTH', 'CORE',
 'Obliques', 'Transverse Abdominis,Rectus Abdominis', 'DUMBBELL',
 FALSE, FALSE, FALSE, FALSE, TRUE,
 3, 10, 45, 3.5, 'CORE', 'ISOLATION',
 4, 6, '2-2-2', TRUE, TRUE, TRUE, 'ACTIVE'),

('Weighted Plank',
 'Standard plank with dumbbell on upper back. Increases core demand.',
 'HARD', 'STRENGTH', 'CORE',
 'Transverse Abdominis', 'Erector Spinae,Deltoid', 'DUMBBELL',
 FALSE, FALSE, FALSE, FALSE, TRUE,
 3, 30, 60, 4.0, 'CORE', 'ISOLATION',
 6, 8, '0-0-0', FALSE, FALSE, TRUE, 'ACTIVE'),

-- ═══════════════════════════════════════════════════════════
-- CARDIO — BODYWEIGHT (3 more for variety)
-- ═══════════════════════════════════════════════════════════

('Box Step Tap',
 'Low-impact stepping side to side, tapping a box or line. Senior-friendly cardio.',
 'EASY', 'CARDIO', 'CARDIO',
 'Calves', 'Quadriceps,Hip Abductors', 'BODYWEIGHT',
 FALSE, FALSE, FALSE, FALSE, FALSE,
 3, 30, 30, 4.0, 'CARDIO', 'COMPOUND',
 3, 5, '1-0-1', TRUE, TRUE, TRUE, 'ACTIVE'),

('Bear Crawl',
 'On hands and feet, crawl forward and backward. Full body coordination and core.',
 'MEDIUM', 'CARDIO', 'CARDIO',
 'Core', 'Deltoid,Quadriceps,Glutes', 'BODYWEIGHT',
 FALSE, TRUE, FALSE, FALSE, TRUE,
 3, 20, 45, 7.0, 'CARDIO', 'COMPOUND',
 6, 8, '1-0-1', FALSE, FALSE, TRUE, 'ACTIVE'),

('Squat to Lateral Step',
 'Squat then step side, squat again. Low impact cardio with leg toning.',
 'EASY', 'CARDIO', 'CARDIO',
 'Glutes', 'Quadriceps,Hip Abductors', 'BODYWEIGHT',
 FALSE, TRUE, FALSE, FALSE, FALSE,
 3, 20, 30, 5.5, 'LEGS', 'COMPOUND',
 4, 6, '1-0-1', TRUE, TRUE, FALSE, 'ACTIVE')

ON CONFLICT DO NOTHING;
