-- V15: Exercise image_url + video_url
-- Images: free-exercise-db (github.com/yuhonas/free-exercise-db, CC BY 4.0)
-- Videos: YouTube embeds (curated tutorial videos)

-- ══════════════════════════════════════════════════════════════════
--  CORE BODYWEIGHT
-- ══════════════════════════════════════════════════════════════════
UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Push-Up/0.jpg',
  video_url = 'https://www.youtube.com/embed/_YrJc-kTYA0'
  WHERE exercise_name = 'Push Up';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bodyweight_Squat/0.jpg',
  video_url = 'https://www.youtube.com/embed/eFEVKmp3M4g'
  WHERE exercise_name = 'Bodyweight Squat';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg',
  video_url = 'https://www.youtube.com/embed/xe2MXatLTUw'
  WHERE exercise_name = 'Plank';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cat_Stretch/0.jpg',
  video_url = 'https://www.youtube.com/embed/LIVJZZyZ2qM'
  WHERE exercise_name = 'Cat Cow Stretch';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Push-Up/0.jpg',
  video_url = 'https://www.youtube.com/embed/cfns5VDVVvk'
  WHERE exercise_name = 'Incline Push Up';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Kneeling_Push-Up/0.jpg',
  video_url = 'https://www.youtube.com/embed/rrVwNeIpy-k'
  WHERE exercise_name = 'Knee Push Up';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pike_Push-Up/0.jpg',
  video_url = 'https://www.youtube.com/embed/V6BtY3Lt0Ys'
  WHERE exercise_name IN ('Pike Push Up');

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Goblet_Squat/0.jpg',
  video_url = 'https://www.youtube.com/embed/lRYBbchqxtI'
  WHERE exercise_name = 'Goblet Squat';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Crossover_Reverse_Lunge/0.jpg',
  video_url = 'https://www.youtube.com/embed/38xlLGfguz4'
  WHERE exercise_name = 'Reverse Lunge';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Glute_Bridge/0.jpg',
  video_url = 'https://www.youtube.com/embed/OUgsJ8-Vi0E'
  WHERE exercise_name = 'Glute Bridge';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Hip_Thrust/0.jpg',
  video_url = 'https://www.youtube.com/embed/pF17m_CXfL0'
  WHERE exercise_name = 'Hip Thrust';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bird_Dog/0.jpg',
  video_url = 'https://www.youtube.com/embed/Yap7kqAFHYo'
  WHERE exercise_name = 'Bird Dog';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dead_Bug/0.jpg',
  video_url = 'https://www.youtube.com/embed/o4GKiEoYClI'
  WHERE exercise_name = 'Dead Bug';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Plank/0.jpg',
  video_url = 'https://www.youtube.com/embed/NQsqPcarPXY'
  WHERE exercise_name = 'Side Plank';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Jumping_Jacks/0.jpg',
  video_url = 'https://www.youtube.com/embed/c4DAnQ6DtF8'
  WHERE exercise_name IN ('Jumping Jacks', 'Low Impact Step Jack');

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Mountain_Climbers/0.jpg',
  video_url = 'https://www.youtube.com/embed/hZb6jTbCLeE'
  WHERE exercise_name = 'Mountain Climber';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Burpees/0.jpg',
  video_url = 'https://www.youtube.com/embed/dZgVxmf6jkA'
  WHERE exercise_name = 'Burpee';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Superman/0.jpg',
  video_url = 'https://www.youtube.com/embed/ZH0FS5Gp_eg'
  WHERE exercise_name = 'Superman';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Band_Pull_Apart/0.jpg',
  video_url = 'https://www.youtube.com/embed/kZNeqj-wtE0'
  WHERE exercise_name = 'Band Pull Apart';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Face_Pull/0.jpg',
  video_url = 'https://www.youtube.com/embed/Qij3pSB-gNk'
  WHERE exercise_name = 'Face Pull (Band)';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Inverted_Row/0.jpg',
  video_url = 'https://www.youtube.com/embed/vZy_Eu_Z0WA'
  WHERE exercise_name = 'Inverted Row';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Chin-Up/0.jpg',
  video_url = 'https://www.youtube.com/embed/Oi3bW9nQmGI'
  WHERE exercise_name = 'Chin Up';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Band_Assisted_Pull-Up/0.jpg',
  video_url = 'https://www.youtube.com/embed/ym1V5H35IpA'
  WHERE exercise_name = 'Pull Up';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dips_-_Triceps_Version/0.jpg',
  video_url = 'https://www.youtube.com/embed/ci5tcFgIntI'
  WHERE exercise_name = 'Dip';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Push-Up/0.jpg',
  video_url = 'https://www.youtube.com/embed/dcV-ATSeryA'
  WHERE exercise_name = 'Decline Push Up';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Push-Up/0.jpg',
  video_url = 'https://www.youtube.com/embed/PPTj-MW2tcs'
  WHERE exercise_name = 'Diamond Push Up';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Push-Up/0.jpg',
  video_url = 'https://www.youtube.com/embed/JScZgCrcJQU'
  WHERE exercise_name = 'Wide Push Up';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Push-Up/0.jpg',
  video_url = 'https://www.youtube.com/embed/DzWzekJ1ZGs'
  WHERE exercise_name = 'Staggered Push Up';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Push-Up/0.jpg',
  video_url = 'https://www.youtube.com/embed/mzr0RYNDzzI'
  WHERE exercise_name = 'Archer Push Up';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Push-Up/0.jpg',
  video_url = 'https://www.youtube.com/embed/wcKyqAMqueQ'
  WHERE exercise_name = 'Shoulder Tap';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Overhead_Press/0.jpg',
  video_url = 'https://www.youtube.com/embed/zoN5EH50Dro'
  WHERE exercise_name = 'Overhead Press (Bodyweight)';

-- ══════════════════════════════════════════════════════════════════
--  LOWER BODY
-- ══════════════════════════════════════════════════════════════════
UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Full_Squat/0.jpg',
  video_url = 'https://www.youtube.com/embed/sQ-lwJtpwUc'
  WHERE exercise_name = 'Sumo Squat';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lateral_Bound/0.jpg',
  video_url = 'https://www.youtube.com/embed/vwK7vZNQwUI'
  WHERE exercise_name = 'Lateral Lunge';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wall_Squat/0.jpg',
  video_url = 'https://www.youtube.com/embed/cWTZ8Am1Ee0'
  WHERE exercise_name = 'Wall Sit';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Calf_Raise_On_A_Dumbbell/0.jpg',
  video_url = 'https://www.youtube.com/embed/CtyIVeJH6lI'
  WHERE exercise_name = 'Calf Raise';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Step-Ups/0.jpg',
  video_url = 'https://www.youtube.com/embed/8q9LVgN2RD4'
  WHERE exercise_name IN ('Step Up', 'Box Step Tap');

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bulgarian_Split_Squat/0.jpg',
  video_url = 'https://www.youtube.com/embed/uODWo4YqbT8'
  WHERE exercise_name = 'Bulgarian Split Squat';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Single-Leg_High_Box_Squat/0.jpg',
  video_url = 'https://www.youtube.com/embed/84hrdsHgDuQ'
  WHERE exercise_name = 'Single Leg Deadlift';

-- ══════════════════════════════════════════════════════════════════
--  CORE
-- ══════════════════════════════════════════════════════════════════
UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Russian_Twist/0.jpg',
  video_url = 'https://www.youtube.com/embed/-BzNffL_6YE'
  WHERE exercise_name IN ('Russian Twist', 'Dumbbell Russian Twist');

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hollow_Rock/0.jpg',
  video_url = 'https://www.youtube.com/embed/FYojATjHStg'
  WHERE exercise_name = 'Hollow Hold';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lying_Leg-Hip_Raise/0.jpg',
  video_url = 'https://www.youtube.com/embed/U4L_6JEv9Jg'
  WHERE exercise_name = 'Leg Raise';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bicycle_Crunch/0.jpg',
  video_url = 'https://www.youtube.com/embed/NWzlS1Lp1e8'
  WHERE exercise_name = 'Bicycle Crunch';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Weighted_Ball_Hyperextension/0.jpg',
  video_url = 'https://www.youtube.com/embed/v25dawSzRTM'
  WHERE exercise_name = 'Weighted Plank';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Band_Pallof_Press/0.jpg',
  video_url = 'https://www.youtube.com/embed/5aZ0IhJS8O8'
  WHERE exercise_name = 'Dumbbell Pallof Press';

-- ══════════════════════════════════════════════════════════════════
--  CARDIO
-- ══════════════════════════════════════════════════════════════════
UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/High_Knee_March_In_Place/0.jpg',
  video_url = 'https://www.youtube.com/embed/0X0Q8wKLEfo'
  WHERE exercise_name = 'High Knees';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Jump_Squat/0.jpg',
  video_url = 'https://www.youtube.com/embed/h5TmdMMtIT4'
  WHERE exercise_name = 'Jump Squat';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lateral_Bound/0.jpg',
  video_url = 'https://www.youtube.com/embed/qM5jviFhw9U'
  WHERE exercise_name IN ('Skater Jump', 'Squat to Lateral Step');

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Speed_Squats/0.jpg',
  video_url = 'https://www.youtube.com/embed/eFEVKmp3M4g'
  WHERE exercise_name = 'Speed Squat';

UPDATE exercises SET
  video_url = 'https://www.youtube.com/embed/J4j3AOVWuHE'
  WHERE exercise_name = 'Shadow Boxing';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bear_Crawl_Sled_Drags/0.jpg',
  video_url = 'https://www.youtube.com/embed/LCVMqEmgglo'
  WHERE exercise_name = 'Bear Crawl';

-- ══════════════════════════════════════════════════════════════════
--  MOBILITY / STRETCH
-- ══════════════════════════════════════════════════════════════════
UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cat_Stretch/0.jpg',
  video_url = 'https://www.youtube.com/embed/2of247Kt0tU'
  WHERE exercise_name IN ('Cat-Cow', 'Cat Cow Stretch');

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Worlds_Greatest_Stretch/0.jpg',
  video_url = 'https://www.youtube.com/embed/-CiWQ2IvY34'
  WHERE exercise_name = 'World''s Greatest Stretch';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Ankle_Circles/0.jpg',
  video_url = 'https://www.youtube.com/embed/9tFDZqo-X3o'
  WHERE exercise_name = 'Ankle Circle';

UPDATE exercises SET
  video_url = 'https://www.youtube.com/embed/l3Ze_9iXL-M'
  WHERE exercise_name = 'Thoracic Rotation';

UPDATE exercises SET
  video_url = 'https://www.youtube.com/embed/ktgtEWGhFd8'
  WHERE exercise_name = 'Hip Flexor Stretch';

UPDATE exercises SET
  video_url = 'https://www.youtube.com/embed/t4Zz6-aG8Iw'
  WHERE exercise_name = 'Hip 90/90 Stretch';

UPDATE exercises SET
  video_url = 'https://www.youtube.com/embed/i_0zLUcE-zk'
  WHERE exercise_name = 'Wall Slide';

-- ══════════════════════════════════════════════════════════════════
--  DUMBBELL EXERCISES
-- ══════════════════════════════════════════════════════════════════
UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shoulder_Press/0.jpg',
  video_url = 'https://www.youtube.com/embed/k6tzKisR3NY'
  WHERE exercise_name = 'Dumbbell Shoulder Press';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bench_Press/0.jpg',
  video_url = 'https://www.youtube.com/embed/1V3vpcaxRYQ'
  WHERE exercise_name = 'Dumbbell Bench Press';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/0.jpg',
  video_url = 'https://www.youtube.com/embed/CBOhr6H7BEY'
  WHERE exercise_name = 'Dumbbell Romanian Deadlift';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Two-Dumbbell_Row/0.jpg',
  video_url = 'https://www.youtube.com/embed/yHqqGd0tXcw'
  WHERE exercise_name = 'Dumbbell Row';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent-Arm_Dumbbell_Pullover/0.jpg',
  video_url = 'https://www.youtube.com/embed/Datv2L6t3-4'
  WHERE exercise_name = 'Dumbbell Pullover';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Lying_Rear_Lateral_Raise/0.jpg',
  video_url = 'https://www.youtube.com/embed/LsT-bR_zxLo'
  WHERE exercise_name = 'Dumbbell Rear Delt Fly';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bicep_Curl/0.jpg',
  video_url = 'https://www.youtube.com/embed/XE_pHwbst04'
  WHERE exercise_name = 'Dumbbell Bicep Curl';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Alternate_Hammer_Curl/0.jpg',
  video_url = 'https://www.youtube.com/embed/BRVDS6HVR9Q'
  WHERE exercise_name = 'Dumbbell Hammer Curl';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Row/0.jpg',
  video_url = 'https://www.youtube.com/embed/czoQ_ncuqqI'
  WHERE exercise_name = 'Incline Dumbbell Row';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Dumbbell_Flyes/0.jpg',
  video_url = 'https://www.youtube.com/embed/rk8YayRoTRQ'
  WHERE exercise_name = 'Dumbbell Chest Fly';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Lateral_Raise/0.jpg',
  video_url = 'https://www.youtube.com/embed/JIhbYYA1Q90'
  WHERE exercise_name = 'Dumbbell Lateral Raise';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Raise_-_Front/0.jpg',
  video_url = 'https://www.youtube.com/embed/CH9JzDStL3U'
  WHERE exercise_name = 'Dumbbell Front Raise';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Tricep_Kickback/0.jpg',
  video_url = 'https://www.youtube.com/embed/GZ3NzlJs_yg'
  WHERE exercise_name = 'Dumbbell Tricep Kickback';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Arnold_Dumbbell_Press/0.jpg',
  video_url = 'https://www.youtube.com/embed/6K_N9AGhItQ'
  WHERE exercise_name = 'Dumbbell Arnold Press';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Lunges/0.jpg',
  video_url = 'https://www.youtube.com/embed/mJilHWIBWO8'
  WHERE exercise_name = 'Dumbbell Lunge';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bulgarian_Split_Squat/0.jpg',
  video_url = 'https://www.youtube.com/embed/sw4MzpC8l58'
  WHERE exercise_name = 'Dumbbell Split Squat';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Step_Ups/0.jpg',
  video_url = 'https://www.youtube.com/embed/8q9LVgN2RD4'
  WHERE exercise_name = 'Dumbbell Step Up';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Full_Squat/0.jpg',
  video_url = 'https://www.youtube.com/embed/sQ-lwJtpwUc'
  WHERE exercise_name = 'Dumbbell Sumo Squat';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Calf_Raise_On_A_Dumbbell/0.jpg',
  video_url = 'https://www.youtube.com/embed/fOfPwmb5FXU'
  WHERE exercise_name = 'Dumbbell Calf Raise';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Kettlebell_Thruster/0.jpg',
  video_url = 'https://www.youtube.com/embed/qnOikHllwWc'
  WHERE exercise_name = 'Dumbbell Thruster';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Farmers_Walk/0.jpg',
  video_url = 'https://www.youtube.com/embed/1uOs1hP3u4A'
  WHERE exercise_name = 'Dumbbell Farmer Carry';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/0.jpg',
  video_url = 'https://www.youtube.com/embed/YQgs03p3UxE'
  WHERE exercise_name = 'Dumbbell Deadlift';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Alternating_Renegade_Row/0.jpg',
  video_url = 'https://www.youtube.com/embed/wTqlJ0aoJlM'
  WHERE exercise_name = 'Dumbbell Renegade Row';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Clean_and_Press/0.jpg',
  video_url = 'https://www.youtube.com/embed/sZ4XMWn8bAU'
  WHERE exercise_name = 'Dumbbell Clean and Press';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Arm_Kettlebell_Swings/0.jpg',
  video_url = 'https://www.youtube.com/embed/tR4cfEutWuM'
  WHERE exercise_name = 'Dumbbell Swing';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Russian_Twist/0.jpg',
  video_url = 'https://www.youtube.com/embed/wkD8rjkodUI'
  WHERE exercise_name = 'Dumbbell Russian Twist';

-- ══════════════════════════════════════════════════════════════════
--  RESISTANCE BAND / MISCELLANEOUS
-- ══════════════════════════════════════════════════════════════════
UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Two-Dumbbell_Row/0.jpg',
  video_url = 'https://www.youtube.com/embed/LSkyinhmA8k'
  WHERE exercise_name = 'Resistance Band Row';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Superman/0.jpg',
  video_url = 'https://www.youtube.com/embed/hgjCwjO2YUY'
  WHERE exercise_name = 'Prone Cobra';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Two-Dumbbell_Row/0.jpg',
  video_url = 'https://www.youtube.com/embed/JUzWqsBm2ZE'
  WHERE exercise_name = 'Table Row';

UPDATE exercises SET
  image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Two-Dumbbell_Row/0.jpg',
  video_url = 'https://www.youtube.com/embed/w9M7m0ztUXo'
  WHERE exercise_name = 'Doorway Row';

