package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.DTO.user.*;
import com.example.fitchallenge.DTO.user.userProfile.*;
import com.example.fitchallenge.Entity.*;
import com.example.fitchallenge.Security.JWT.JwtTokenProvider;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.repository.*;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.service.EmailService;
import com.example.fitchallenge.service.UserService;
import com.example.fitchallenge.exception.DuplicateResourceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    // Core dependencies
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RoleRepository roleRepository;

    // Password reset
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailService emailService;

    // Google login
    private final com.example.fitchallenge.Security.GoogleTokenVerifier googleTokenVerifier;

    private final com.example.fitchallenge.repository.AiPackageRepository aiPackageRepository;

    // Supporting services for better separation of concerns
    private final UserChallengeRepository userChallengeRepository;
    private final UserTrainingRepository userTrainingRepository;
    private final PersonalizedNutritionPlanRepository personalizedNutritionPlanRepository;
    private final TrainingPlanDetailRepository trainingPlanDetailRepository;
    private final UserBodyProfileRepository userBodyProfileRepository;
    private final DailyTrainingLogRepository dailyTrainingLogRepository;
    @Override
    public JwtResponse register(RegisterRequestAdmin registerRequestAdmin) {
        // 1. Validate input
        if (registerRequestAdmin.getEmail() == null || registerRequestAdmin.getEmail().trim().isEmpty()) {
            throw new RuntimeException("Email is required");
        }
        if (registerRequestAdmin.getFullName() == null || registerRequestAdmin.getFullName().trim().isEmpty()) {
            throw new RuntimeException("Full name is required");
        }
        if (registerRequestAdmin.getPassword() == null || registerRequestAdmin.getPassword().trim().isEmpty()) {
            throw new RuntimeException("Password is required");
        }
        if (registerRequestAdmin.getPassword().length() < 6) {
            throw new RuntimeException("Password must be at least 6 characters");
        }

        // 2. Check email tồn tại
        if(userRepository.existsByEmail(registerRequestAdmin.getEmail().trim())) {
            throw new RuntimeException("Email đã tồn tại!");
        }

        // 3. Lấy role theo roleId từ request, default = 2 (USER) nếu null
        Long roleId = registerRequestAdmin.getRoleId() != null ? registerRequestAdmin.getRoleId() : 2L;
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Role không tồn tại (ID: " + roleId + "). Vui lòng đảm bảo role USER (ID=2) đã được tạo trong database."));

        // 4. Tạo user mới
        User user = new User();
        String fullName = registerRequestAdmin.getFullName().trim();
        user.setUserName(fullName);
        user.setFullName(fullName);
        user.setEmail(registerRequestAdmin.getEmail().trim().toLowerCase());
        user.setPassword(passwordEncoder.encode(registerRequestAdmin.getPassword()));
        user.setRole(role);
        user.setStatus("active"); // Set default status
        user.setPoints(0); // Set default points
        user.setLevelPoints(0); // XP tích luỹ ban đầu
        ZonedDateTime now = ZonedDateTime.now();
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        user.setLastLoginAt(now);

        // 5. Save vào DB
        try {
            User savedUser = userRepository.save(user);

            // 6. Generate tokens and return response
            String token = jwtTokenProvider.generateToken(savedUser.getEmail(), savedUser.getRole().getRoleName());
            String refreshToken = jwtTokenProvider.generateRefreshToken(savedUser.getEmail());

            JwtResponse.JwtUserInfoDTO userInfo = new JwtResponse.JwtUserInfoDTO(
                    savedUser.getId(),
                    savedUser.getEmail(),
                    savedUser.getFullName() != null ? savedUser.getFullName() : savedUser.getUserName(),
                    savedUser.getRole().getRoleName()
            );

            return new JwtResponse(token, refreshToken, userInfo);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save user: " + e.getMessage(), e);
        }
    }

    @Override
    public JwtResponse registerCustomer(RegisterRequestCustomer registerRequestCustomer) {
        // 1. Validate input → IllegalArgumentException ⇒ 400 BAD_REQUEST (có message rõ)
        if (registerRequestCustomer.getEmail() == null || registerRequestCustomer.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Email là bắt buộc");
        }
        if (registerRequestCustomer.getPassword() == null || registerRequestCustomer.getPassword().length() < 6) {
            throw new IllegalArgumentException("Mật khẩu phải có ít nhất 6 ký tự");
        }

        // 2. Check email tồn tại → DuplicateResourceException ⇒ 409 CONFLICT (không còn 500)
        String email = registerRequestCustomer.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("Email này đã được đăng ký!");
        }

        // 3. Lấy Role mặc định (Bạn đang để ID là 5 cho Customer)
        Role userRole = roleRepository.findById(5L)
                .orElseThrow(() -> new RuntimeException("Role USER (ID: 5) chưa được khởi tạo trong DB."));

        // 4. Tạo User mới
        User newUser = new User();
        String fullName = registerRequestCustomer.getFullName() != null ? registerRequestCustomer.getFullName().trim() : "New User";

        newUser.setFullName(fullName);
        newUser.setUserName(fullName);
        newUser.setEmail(email);
        newUser.setPassword(passwordEncoder.encode(registerRequestCustomer.getPassword()));
        newUser.setRole(userRole);
        newUser.setStatus("active");
        newUser.setPoints(0);
        newUser.setLevelPoints(0);
        newUser.setReferralCode(generateReferralCode());

        ZonedDateTime now = ZonedDateTime.now();
        newUser.setCreatedAt(now);
        newUser.setUpdatedAt(now);
        newUser.setLastLoginAt(now);

        // 5. Lưu và tạo Token
        try {
            User savedUser = userRepository.save(newUser);

            String token = jwtTokenProvider.generateToken(savedUser.getEmail(), savedUser.getRole().getRoleName());
            String refreshToken = jwtTokenProvider.generateRefreshToken(savedUser.getEmail());

            JwtResponse.JwtUserInfoDTO userInfo = new JwtResponse.JwtUserInfoDTO(
                    savedUser.getId(),
                    savedUser.getEmail(),
                    savedUser.getFullName() != null ? savedUser.getFullName() : savedUser.getUserName(),
                    savedUser.getRole().getRoleName()
            );

            return new JwtResponse(token, refreshToken, userInfo);

        } catch (Exception e) {
            throw new RuntimeException("Lỗi lưu dữ liệu: " + e.getMessage());
        }
    }

    @Override
    public Map<String, Object> getMyReferralInfo(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("User not found: " + userId));
        int count = user.getReferralCount() == null ? 0 : user.getReferralCount();
        String pkg = user.getAiPackage() != null ? user.getAiPackage().getCode() : "FREE";
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("referralCode", user.getReferralCode());
        res.put("referralCount", count);
        res.put("creditsEarned", count * 20);
        res.put("currentPackage", pkg);
        // Milestones: 5 → PLUS, 20 → PRO
        res.put("referralsUntilPlus", Math.max(0, 5 - count));
        res.put("referralsUntilPro", Math.max(0, 20 - count));
        res.put("plusUnlocked", count >= 5);
        res.put("proUnlocked", count >= 20);
        return res;
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public Map<String, Object> applyReferralCode(Long userId, String code) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("User not found: " + userId));

        if (user.getReferredBy() != null) {
            throw new IllegalStateException("Bạn đã nhập mã giới thiệu trước đó rồi.");
        }
        String trimmed = code.trim().toUpperCase();
        User referrer = userRepository.findByReferralCode(trimmed)
                .orElseThrow(() -> new IllegalArgumentException("Mã giới thiệu không tồn tại: " + trimmed));
        if (referrer.getId().equals(userId)) {
            throw new IllegalArgumentException("Không thể dùng mã của chính mình.");
        }

        // Tặng người được mời +25 credit
        user.setReferredBy(referrer);
        int bonusForInvitee = 25;
        user.setAiQuota((user.getAiQuota() == null ? 25 : user.getAiQuota()) + bonusForInvitee);
        userRepository.save(user);

        // Thưởng người mời
        rewardReferrer(referrer);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("message", "Mã hợp lệ! Bạn nhận được +" + bonusForInvitee + " AI credit.");
        res.put("bonusCredits", bonusForInvitee);
        res.put("referrerName", referrer.getFullName() != null ? referrer.getFullName() : referrer.getUserName());
        return res;
    }

    private void rewardReferrer(User referrer) {
        int current = referrer.getReferralCount() == null ? 0 : referrer.getReferralCount();
        int newCount = current + 1;
        referrer.setReferralCount(newCount);
        // +20 credit mỗi lần (cap 500 khi chưa lên gói cao)
        int newQuota = (referrer.getAiQuota() == null ? 25 : referrer.getAiQuota()) + 20;
        referrer.setAiQuota(Math.min(newQuota, 500));
        // Milestone: 20 → PRO, 5 → PLUS
        if (newCount >= 20) {
            aiPackageRepository.findByCode("PRO").ifPresent(pkg -> {
                referrer.setAiPackage(pkg);
                referrer.setAiQuota(pkg.getAiQuota());
                referrer.setAiUsed(0);
                referrer.setAiResetAt(ZonedDateTime.now().plusDays(30));
                referrer.setAiPackageExpiresAt(ZonedDateTime.now().plusDays(30));
                log.info("Referral milestone PRO: userId={} count={}", referrer.getId(), newCount);
            });
        } else if (newCount >= 5) {
            aiPackageRepository.findByCode("PLUS").ifPresent(pkg -> {
                referrer.setAiPackage(pkg);
                referrer.setAiQuota(pkg.getAiQuota());
                referrer.setAiUsed(0);
                referrer.setAiResetAt(ZonedDateTime.now().plusDays(30));
                referrer.setAiPackageExpiresAt(ZonedDateTime.now().plusDays(30));
                log.info("Referral milestone PLUS: userId={} count={}", referrer.getId(), newCount);
            });
        }
        userRepository.save(referrer);
        log.info("Referral rewarded: referrerId={} newCount={}", referrer.getId(), newCount);
    }

    private static final String REFERRAL_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private String generateReferralCode() {
        for (int attempt = 0; attempt < 10; attempt++) {
            StringBuilder sb = new StringBuilder(8);
            for (int i = 0; i < 8; i++) sb.append(REFERRAL_CHARS.charAt(SECURE_RANDOM.nextInt(REFERRAL_CHARS.length())));
            String code = sb.toString();
            if (userRepository.findByReferralCode(code).isEmpty()) return code;
        }
        // fallback: timestamp-based, guaranteed unique
        return "R" + Long.toString(System.currentTimeMillis(), 36).toUpperCase().substring(0, 7);
    }


    @Override
    public JwtResponse login(LoginRequest loginRequest) {
        Optional<User> userOpt = userRepository.findByEmail(loginRequest.getEmail());
        if (userOpt.isEmpty()) {
            // Use the same message for both cases to prevent user enumeration
            throw new org.springframework.security.authentication.BadCredentialsException("Invalid email or password");
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            throw new org.springframework.security.authentication.BadCredentialsException("Invalid email or password");
        }

        // Tài khoản bị vô hiệu hoá (xoá mềm / admin khoá) → chặn đăng nhập
        if (user.getStatus() != null && "inactive".equalsIgnoreCase(user.getStatus().trim())) {
            throw new org.springframework.security.authentication.DisabledException(
                    "Tài khoản đã bị vô hiệu hoá. Vui lòng liên hệ hỗ trợ.");
        }

        // Update last login time
        user.setLastLoginAt(ZonedDateTime.now());
        userRepository.save(user);

        // Generate tokens
        String token = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().getRoleName());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getEmail());

        // Create user info DTO
        JwtResponse.JwtUserInfoDTO userInfo = new JwtResponse.JwtUserInfoDTO(
                user.getId(),
                user.getEmail(),
                user.getFullName() != null ? user.getFullName() : user.getUserName(),
                user.getRole().getRoleName()
        );

        return new JwtResponse(token, refreshToken, userInfo);
    }


    @Override
    @Transactional
    public JwtResponse loginWithGoogle(String idToken) {
        // 1. Verify ID token với Google (chữ ký + audience = client-id của ta)
        com.example.fitchallenge.Security.GoogleTokenVerifier.GoogleUser g =
                googleTokenVerifier.verify(idToken);

        if (g.email() == null || g.email().isBlank()) {
            throw new IllegalArgumentException("Tài khoản Google không có email");
        }
        if (!g.emailVerified()) {
            throw new IllegalArgumentException("Email Google chưa được xác thực");
        }
        String email = g.email().trim().toLowerCase();

        // 2. Tìm user theo email; chưa có thì tự tạo (đăng nhập = đăng ký luôn)
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            Role userRole = roleRepository.findById(5L)
                    .orElseThrow(() -> new RuntimeException("Role USER (ID: 5) chưa được khởi tạo trong DB."));

            User newUser = new User();
            String fullName = (g.name() != null && !g.name().isBlank())
                    ? g.name().trim()
                    : email.split("@")[0];
            newUser.setFullName(fullName);
            // userName có ràng buộc UNIQUE — dùng email để chắc chắn không đụng giữa các user trùng tên
            newUser.setUserName(email);
            newUser.setEmail(email);
            // User Google không có mật khẩu — set chuỗi ngẫu nhiên đã mã hoá (không ai login local bằng nó được)
            newUser.setPassword(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
            newUser.setRole(userRole);
            newUser.setStatus("active");
            newUser.setPoints(0);
            newUser.setLevelPoints(0);
            if (g.picture() != null && !g.picture().isBlank()) {
                newUser.setLinkImage(g.picture());
            }
            ZonedDateTime created = ZonedDateTime.now();
            newUser.setCreatedAt(created);
            newUser.setUpdatedAt(created);
            newUser.setLastLoginAt(created);
            log.info("[GoogleAuth] Tạo user mới từ Google: {}", email);
            return userRepository.save(newUser);
        });

        // 3. Cập nhật last login + phát JWT giống login thường
        user.setLastLoginAt(ZonedDateTime.now());
        userRepository.save(user);

        String token = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().getRoleName());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getEmail());

        JwtResponse.JwtUserInfoDTO userInfo = new JwtResponse.JwtUserInfoDTO(
                user.getId(),
                user.getEmail(),
                user.getFullName() != null ? user.getFullName() : user.getUserName(),
                user.getRole().getRoleName()
        );
        return new JwtResponse(token, refreshToken, userInfo);
    }

    @Override
    public UserDetails loadUserByEmail(String email)  {
        // Tìm user trong DB
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + email));

        // Trả về một đối tượng UserDetails
        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPassword())
                .authorities((GrantedAuthority) user.getRole()) // có thể lấy từ role của user
                .build();
    }

    @Override
    public NotificationResponse getAllUsers() {
        List<UserDTO> users = userRepository.findAll()
        .stream().map(user ->  {
            UserDTO dto = UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName() != null ? user.getFullName() : user.getUserName())
                .linkImage(user.getLinkImage())
                .profileImage(user.getLinkImage()) // Map to profileImage for FE
                .createdAt(user.getCreatedAt())
                .status(user.getStatus() != null ? user.getStatus() : "active")
                .build();
            dto.setLastLoginAt(user.getLastLoginAt());
            dto.setRole(user.getRole().getRoleName());
            dto.setStatus(user.getStatus());
            applyAiPackageInfo(dto, user);
            return dto;
        }).collect(Collectors.toList()); // ẩn password trước khi trả về

        return new NotificationResponse(true, "Success", users);


    }

    @Override
    public UserDTO getUserById(Long id) {
        return userRepository.findById(id).map(user -> {
            UserDTO dto = UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName() != null ? user.getFullName() : user.getUserName())
                .role(user.getRole().getRoleName())
                .linkImage(user.getLinkImage())
                .profileImage(user.getLinkImage()) // Map to profileImage for FE
                .createdAt(user.getCreatedAt())
                .status(user.getStatus())
                .build();
            dto.setUpdatedAt(user.getUpdatedAt());
            dto.setLastLoginAt(user.getLastLoginAt());
            applyAiPackageInfo(dto, user);
            return dto;
        }).orElseThrow(() -> new RuntimeException("User not found"));
    }

    /** Gán thông tin gói AI hiện tại lên DTO để admin xem trực tiếp. */
    private void applyAiPackageInfo(UserDTO dto, User user) {
        if (user.getAiPackage() != null) {
            dto.setAiPackageCode(user.getAiPackage().getCode());
            dto.setAiPackageName(user.getAiPackage().getName());
        } else {
            dto.setAiPackageCode("FREE");
        }
        dto.setAiQuota(user.getAiQuota());
        dto.setAiUsed(user.getAiUsed());
        dto.setAiPackageExpiresAt(user.getAiPackageExpiresAt());
    }

    @Override
    public com.example.fitchallenge.Entity.User getUserEntityById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Override
    public UserDTO getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserDTO dto = UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName() != null ? user.getFullName() : user.getUserName())
                .role(user.getRole().getRoleName())
                .linkImage(user.getLinkImage())
                .profileImage(user.getLinkImage()) // Map to profileImage for FE
                .createdAt(user.getCreatedAt())
                .status(user.getStatus())
                .build();
        dto.setUpdatedAt(user.getUpdatedAt());
        dto.setLastLoginAt(user.getLastLoginAt());
        dto.setStatus(user.getStatus());
        return dto;
    }

    @Override
    public UserProfileDTO getUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Tính currentStreak (số ngày liên tục hoàn thành challenge)
        int currentStreak = calculateCurrentStreak(userId);

        // Format joinDate
        String joinDate = user.getCreatedAt() != null
                ? user.getCreatedAt().toInstant().atZone(ZoneId.systemDefault())
                .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                : null;

        return UserProfileDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUserName())
                .avatar(user.getLinkImage())
                .joinDate(joinDate)
                .currentStreak(currentStreak)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public FullUserProfileDTO getFullUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // UserProfileDTO
        UserProfileDTO profile = getUserProfile(userId);

        // UserStatsDTO
        UserStatsDTO stats = buildUserStatsDTO(userId, user);

        // ActivitySummaryDTO
        ActivitySummaryDTO activity = buildActivitySummaryDTO(userId);

        // List<AchievementDTO>
        List<AchievementDTO> achievements = buildAchievementsDTO(userId, user);

        // UserGoalsDTO
        UserGoalsDTO goals = buildUserGoalsDTO(userId);

        // WeeklyStatsDTO
        WeeklyStatsDTO weeklyStats = buildWeeklyStatsDTO(userId);

        return FullUserProfileDTO.builder()
                .profile(profile)
                .stats(stats)
                .activity(activity)
                .achievements(achievements)
                .goals(goals)
                .weeklyStats(weeklyStats)
                .build();
    }

    private int calculateCurrentStreak(Long userId) {
        List<UserChallenge> challenges = userChallengeRepository.findAll()
                .stream()
                .filter(uc -> uc.getUser().getId().equals(userId) && uc.getStatus() == UserChallenge.UserChallengeStatus.SUCCESS)
                .filter(uc -> uc.getCompletedAt() != null)
                .sorted((a, b) -> b.getCompletedAt().compareTo(a.getCompletedAt()))
                .collect(Collectors.toList());

        if (challenges.isEmpty()) {
            return 0;
        }

        int streak = 0;
        LocalDate lastDate = null;
        LocalDate today = LocalDate.now();

        for (UserChallenge challenge : challenges) {
            LocalDate completedDate = challenge.getCompletedAt().toLocalDate();

            if (lastDate == null) {
                // Ngày đầu tiên
                if (completedDate.equals(today) || completedDate.equals(today.minusDays(1))) {
                    streak = 1;
                    lastDate = completedDate;
                } else {
                    break;
                }
            } else {
                // Kiểm tra ngày liên tiếp
                if (completedDate.equals(lastDate.minusDays(1))) {
                    streak++;
                    lastDate = completedDate;
                } else {
                    break;
                }
            }
        }

        return streak;
    }

    private UserStatsDTO buildUserStatsDTO(Long userId, User user) {
        // Tính challengesCompleted
        long challengesCompleted = userChallengeRepository.findAll()
                .stream()
                .filter(uc -> uc.getUser().getId().equals(userId) && uc.getStatus() == UserChallenge.UserChallengeStatus.SUCCESS)
                .count();

        // Tính totalWorkouts
        long totalWorkouts = userTrainingRepository.findUserTrainingDetailsByUserId(userId)
                .stream()
                .filter(ut -> "completed".equals(ut.getStatus()))
                .count();

        // Tính currentStreak
        int currentStreak = calculateCurrentStreak(userId);

        // AI Score từ points
        Integer aiScore = user.getPoints() != null ? user.getPoints() : 0;

        return UserStatsDTO.builder()
                .aiScore(aiScore)
                .challengesCompleted((int) challengesCompleted)
                .totalWorkouts((int) totalWorkouts)
                .currentStreak(currentStreak)
                .build();
    }

    private ActivitySummaryDTO buildActivitySummaryDTO(Long userId) {
        List<UserTraining> userTrainings = userTrainingRepository.findUserTrainingDetailsByUserId(userId);

        int totalCaloriesBurned = 0;
        int totalMinutes = 0;
        Map<String, Long> workoutCounts = userTrainings.stream()
                .filter(ut -> ut.getTrainingPlan() != null && ut.getTrainingPlan().getTitle() != null)
                .collect(Collectors.groupingBy(
                        ut -> ut.getTrainingPlan().getTitle(),
                        Collectors.counting()
                ));

        String favoriteWorkout = workoutCounts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("N/A");

        // Tính calories và minutes từ training plan details
        for (UserTraining ut : userTrainings) {
            if (ut.getTrainingPlan() != null) {
                List<TrainingPlanDetail> details = trainingPlanDetailRepository
                        .findByTrainingPlan_TpId(ut.getTrainingPlan().getTpId());

                // Giả sử mỗi detail có duration và calories (cần điều chỉnh theo entity thực tế)
                int detailCount = details.size();
                totalMinutes += detailCount * 30; // Default 30 minutes per detail
                totalCaloriesBurned += detailCount * 200; // Default 200 calories per detail
            }
        }

        return ActivitySummaryDTO.builder()
                .totalCaloriesBurned(totalCaloriesBurned)
                .totalMinutes(totalMinutes)
                .favoriteWorkout(favoriteWorkout)
                .build();
    }

    private List<AchievementDTO> buildAchievementsDTO(Long userId, User user) {
        List<AchievementDTO> achievements = new ArrayList<>();

        // Tính số challenge hoàn thành
        long challengesCompleted = userChallengeRepository.findAll()
                .stream()
                .filter(uc -> uc.getUser().getId().equals(userId) && uc.getStatus() == UserChallenge.UserChallengeStatus.SUCCESS)
                .count();

        // Tính số workout hoàn thành
        long workoutsCompleted = userTrainingRepository.findUserTrainingDetailsByUserId(userId)
                .stream()
                .filter(ut -> "completed".equals(ut.getStatus()))
                .count();

        // Achievement: First Challenge
        if (challengesCompleted >= 1) {
            achievements.add(AchievementDTO.builder()
                    .name("First Challenge")
                    .icon("🏆")
                    .color("from-yellow-400 to-orange-500")
                    .build());
        }

        // Achievement: 10 Challenges
        if (challengesCompleted >= 10) {
            achievements.add(AchievementDTO.builder()
                    .name("Challenge Master")
                    .icon("👑")
                    .color("from-purple-400 to-pink-500")
                    .build());
        }

        // Achievement: First Workout
        if (workoutsCompleted >= 1) {
            achievements.add(AchievementDTO.builder()
                    .name("First Workout")
                    .icon("💪")
                    .color("from-blue-400 to-cyan-500")
                    .build());
        }

        // Achievement: 7 Day Streak
        int currentStreak = calculateCurrentStreak(userId);
        if (currentStreak >= 7) {
            achievements.add(AchievementDTO.builder()
                    .name("7 Day Streak")
                    .icon("🔥")
                    .color("from-red-400 to-orange-500")
                    .build());
        }

        // Achievement: Points milestone
        if (user.getPoints() != null && user.getPoints() >= 1000) {
            achievements.add(AchievementDTO.builder()
                    .name("High Scorer")
                    .icon("⭐")
                    .color("from-yellow-400 to-amber-500")
                    .build());
        }

        return achievements;
    }

    private UserGoalsDTO buildUserGoalsDTO(Long userId) {
        // Lấy UserBodyProfile (Single Source of Truth)
        UserBodyProfile bodyInfo = userBodyProfileRepository.findByUser_Id(userId).orElse(null);

        // Lấy dailyCalories từ UserBodyProfile (recommendedCalories) hoặc active PersonalizedNutritionPlan
        Integer dailyCalories = null;
        if (bodyInfo != null && bodyInfo.getRecommendedCalories() != null) {
            dailyCalories = bodyInfo.getRecommendedCalories().intValue();
        } else {
            dailyCalories = userRepository.findById(userId)
                    .flatMap(personalizedNutritionPlanRepository::findActivePlanByUser)
                    .map(PersonalizedNutritionPlan::getTargetCalories)
                    .map(Double::intValue)
                    .orElse(null);
        }

        // Tính weeklyWorkouts từ DailyTrainingLog (completed challenges trong tuần này)
        LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY);
        LocalDate weekEnd = weekStart.plusDays(6);

        long weeklyWorkouts = dailyTrainingLogRepository.findByUser_Id(userId)
                .stream()
                .filter(log -> log.getTrainingDate() != null &&
                             !log.getTrainingDate().isBefore(weekStart) &&
                             !log.getTrainingDate().isAfter(weekEnd) &&
                             log.getStatus() == DailyTrainingLog.DailyTrainingStatus.COMPLETED)
                .map(log -> log.getTrainingDate()) // Get unique dates
                .distinct()
                .count();

        // Tính monthlyDistance từ DailyTrainingLog (nếu có actualDurationMinutes, có thể estimate)
        // For now, set to null as we don't have distance data
        Integer monthlyDistance = null;

        // Lấy goal name từ UserBodyProfile
        String goalName = null;
        Long goalId = null;
        if (bodyInfo != null && bodyInfo.getGoalRef() != null) {
            goalName = bodyInfo.getGoalRef().getName();
            goalId = bodyInfo.getGoalRef().getId();
        }
        // Set default weekly workouts target
        Integer weeklyWorkoutsTarget = 5; // Default target: 5 workouts per week

        return UserGoalsDTO.builder()
                .weeklyWorkouts((int) weeklyWorkouts)
                .weeklyWorkoutsTarget(weeklyWorkoutsTarget)
                .dailyCalories(dailyCalories)
                .monthlyDistance(monthlyDistance)
                .goalName(goalName)
                .goalId(goalId)
                .build();
    }

    private WeeklyStatsDTO buildWeeklyStatsDTO(Long userId) {
        LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY);
        LocalDate weekEnd = weekStart.plusDays(6);

        List<UserTraining> weeklyTrainings = userTrainingRepository.findUserTrainingDetailsByUserId(userId)
                .stream()
                .filter(ut -> ut.getStartDate() != null &&
                             !ut.getStartDate().isBefore(weekStart) &&
                             !ut.getStartDate().isAfter(weekEnd))
                .collect(Collectors.toList());

        int workouts = weeklyTrainings.size();
        int calories = 0;
        int minutes = 0;

        for (UserTraining ut : weeklyTrainings) {
            if (ut.getTrainingPlan() != null) {
                List<TrainingPlanDetail> details = trainingPlanDetailRepository
                        .findByTrainingPlan_TpId(ut.getTrainingPlan().getTpId());

                int detailCount = details.size();
                calories += detailCount * 200; // Default calories per detail
                minutes += detailCount * 30; // Default minutes per detail
            }
        }

        return WeeklyStatsDTO.builder()
                .workouts(workouts)
                .calories(calories)
                .minutes(minutes)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserDTO> getAllUsersPaginated(String status, String role, String search, Pageable pageable) {
        List<User> allUsers = userRepository.findAll();

        // Search by email or username
        if (search != null && !search.isEmpty()) {
            String searchLower = search.toLowerCase();
            allUsers = allUsers.stream()
                    .filter(u -> (u.getEmail() != null && u.getEmail().toLowerCase().contains(searchLower)) ||
                            (u.getUserName() != null && u.getUserName().toLowerCase().contains(searchLower)))
                    .collect(Collectors.toList());
        }

        // Filter by status
        if (status != null && !status.isEmpty()) {
            allUsers = allUsers.stream()
                    .filter(u -> u.getStatus() != null && u.getStatus().equalsIgnoreCase(status))
                    .collect(Collectors.toList());
        }

        // Filter by role
        if (role != null && !role.isEmpty()) {
            allUsers = allUsers.stream()
                    .filter(u -> u.getRole() != null &&
                            u.getRole().getRoleName().equalsIgnoreCase(role))
                    .collect(Collectors.toList());
        }

        // Map to DTOs
        List<UserDTO> dtos = allUsers.stream()
                .map(user -> {
                    UserDTO dto = UserDTO.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .fullName(user.getFullName() != null ? user.getFullName() : user.getUserName())
                        .linkImage(user.getLinkImage())
                        .profileImage(user.getLinkImage())
                        .createdAt(user.getCreatedAt())
                        .status(user.getStatus())
                        .build();
                    dto.setUpdatedAt(user.getUpdatedAt());
                    dto.setLastLoginAt(user.getLastLoginAt());
                    dto.setRole(user.getRole().getRoleName());
                    applyAiPackageInfo(dto, user); // gói AI hiện tại cho admin
                    return dto;
                })
                .collect(Collectors.toList());

        // Apply pagination
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), dtos.size());
        List<UserDTO> pagedDtos = dtos.subList(start, end);

        return new PageImpl<>(pagedDtos, pageable, dtos.size());
    }

    @Override
    public UserDTO createUser(RegisterRequestAdmin request) {
        // Check email exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        // Get role
        Role role = roleRepository.findById(request.getRoleId() != null ? request.getRoleId() : 2)
                .orElseThrow(() -> new RuntimeException("Role not found"));

        // Create user
        User user = new User();
        user.setUserName(request.getFullName());
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        ZonedDateTime now = ZonedDateTime.now();
        user.setCreatedAt(now);
        user.setUpdatedAt(now);

        User savedUser = userRepository.save(user);

        // Return DTO
        return getUserById(savedUser.getId());
    }

    @Override
    public UserDTO updateUser(Long id, RegisterRequestAdmin request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Update fields
        if (request.getFullName() != null) {
            user.setUserName(request.getFullName());
            user.setFullName(request.getFullName());
        }
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new RuntimeException("Email already exists");
            }
            user.setEmail(request.getEmail());
        }
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        if (request.getRoleId() != null) {
            Role role = roleRepository.findById(request.getRoleId())
                    .orElseThrow(() -> new RuntimeException("Role not found"));
            user.setRole(role);
        }
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            // Khoá/mở tài khoản: chuẩn hoá về "active" | "inactive"
            String s = request.getStatus().trim().toLowerCase();
            user.setStatus("active".equals(s) ? "active" : "inactive");
        }

        user.setUpdatedAt(ZonedDateTime.now());
        User savedUser = userRepository.save(user);

        // Return DTO
        return getUserById(savedUser.getId());
    }

    @Override
    public UserDTO updateUserAvatar(Long id, String avatarUrl) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setLinkImage(avatarUrl);
        user.setUpdatedAt(ZonedDateTime.now());
        User savedUser = userRepository.save(user);

        return getUserById(savedUser.getId());
    }

    @Override
    public NotificationResponse logout(String token) {
        try {
            // TODO: Implement logout logic
            // Options for logout implementation:
            // 1. Add token to blacklist (recommended for security)
            // 2. Remove token from client-side storage
            // 3. Invalidate token on server side

            // For now, we'll implement a simple logout response
            // In a production environment, you might want to:
            // - Store the token in a Redis blacklist
            // - Set token expiration to now
            // - Log the logout activity

            return new NotificationResponse(true, "Logout successful");
        } catch (Exception e) {
            return new NotificationResponse(false, "Logout failed: " + e.getMessage());
        }
    }

    @Override
    public NotificationResponse deleteUser(Long id) {
        // Vô hiệu hoá mềm: giữ dữ liệu (đơn hàng, log...), tránh vỡ ràng buộc khoá ngoại.
        // Có thể khôi phục bằng cách đặt lại status="active".
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return new NotificationResponse(false, "User not found");
        }
        user.setStatus("inactive");
        user.setUpdatedAt(ZonedDateTime.now());
        userRepository.save(user);
        return new NotificationResponse(true, "User deactivated successfully");
    }

    // ── User tự quản lý tài khoản ─────────────────────────────────────────────

    @Override
    @Transactional
    public UserDTO updateMyProfile(Long userId, String fullName, String email) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (fullName != null && !fullName.isBlank()) {
            user.setFullName(fullName.trim());
        }
        if (email != null && !email.isBlank()) {
            String normalized = email.trim().toLowerCase();
            if (!normalized.equals(user.getEmail())) {
                if (userRepository.existsByEmail(normalized)) {
                    throw new RuntimeException("Email already exists");
                }
                user.setEmail(normalized);
            }
        }
        user.setUpdatedAt(ZonedDateTime.now());
        return getUserById(userRepository.save(user).getId());
    }

    @Override
    @Transactional
    public void changePassword(Long userId, String currentPassword, String newPassword) {
        if (newPassword == null || newPassword.length() < 6) {
            throw new RuntimeException("New password must be at least 6 characters");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (currentPassword == null || !passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(ZonedDateTime.now());
        userRepository.save(user);
        log.info("[ChangePassword] Đổi mật khẩu thành công cho userId={}", userId);
    }

    @Override
    @Transactional
    public void deactivateMyAccount(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setStatus("inactive");
        user.setUpdatedAt(ZonedDateTime.now());
        userRepository.save(user);
        log.info("[DeactivateAccount] User tự vô hiệu hoá tài khoản userId={}", userId);
    }

    // ── Forgot / Reset password ───────────────────────────────────────────────

    @Override
    @Transactional
    public void forgotPassword(String email) {
        // Tìm user — nếu không có thì im lặng (không tiết lộ email có tồn tại)
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            log.info("[ForgotPassword] Email không tồn tại, bỏ qua: {}", email);
            return;
        }
        User user = userOpt.get();

        // Xóa token cũ của user (mỗi lần chỉ có 1 token active)
        passwordResetTokenRepository.deleteByUser(user);

        // Tạo token mới (UUID 36 chars)
        String tokenValue = java.util.UUID.randomUUID().toString();
        PasswordResetToken token = PasswordResetToken.builder()
                .user(user)
                .token(tokenValue)
                .expiresAt(ZonedDateTime.now().plusMinutes(30))
                .used(false)
                .createdAt(ZonedDateTime.now())
                .build();
        passwordResetTokenRepository.save(token);

        // Gửi email
        String displayName = user.getFullName() != null ? user.getFullName() : user.getUserName();
        emailService.sendPasswordResetEmail(email, displayName, tokenValue);
        log.info("[ForgotPassword] Token tạo thành công cho userId={}", user.getId());
    }

    @Override
    @Transactional
    public void resetPassword(String token, String newPassword) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Token không hợp lệ");
        }
        if (newPassword == null || newPassword.length() < 6) {
            throw new IllegalArgumentException("Mật khẩu phải có ít nhất 6 ký tự");
        }

        PasswordResetToken prt = passwordResetTokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Token không hợp lệ hoặc đã hết hạn"));

        if (prt.isUsed()) {
            throw new IllegalArgumentException("Token này đã được sử dụng. Vui lòng yêu cầu đặt lại mật khẩu mới.");
        }
        if (ZonedDateTime.now().isAfter(prt.getExpiresAt())) {
            throw new IllegalArgumentException("Token đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.");
        }

        // Cập nhật mật khẩu
        User user = prt.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Đánh dấu token đã dùng
        prt.setUsed(true);
        passwordResetTokenRepository.save(prt);

        log.info("[ResetPassword] Đặt lại mật khẩu thành công cho userId={}", user.getId());
    }

}
