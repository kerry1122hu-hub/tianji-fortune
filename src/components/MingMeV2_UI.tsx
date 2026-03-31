/**
 * 明己 MingMe V2.0 — UI 细化层 (Phase 1)
 * Expo Managed Workflow · React Native · iOS 17 native aesthetic
 *
 * ─── 必要依赖 ───────────────────────────────────────────────────────────────
 * npx expo install expo-blur expo-linear-gradient expo-haptics
 * npx expo install react-native-reanimated react-native-gesture-handler
 * npx expo install react-native-safe-area-context
 * npx expo install @react-native-community/datetimepicker
 * npx expo install expo-font @expo-google-fonts/noto-serif-sc
 *
 * babel.config.js 中加入：
 *   plugins: ['react-native-reanimated/plugin']
 *
 * app.json / app.config.js 中加入：
 *   "plugins": ["react-native-reanimated"]
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 本文件输出：
 *   1. 设计 Token（颜色、字体、间距、圆角、阴影）
 *   2. 动效原语（fade、slide、scale、stagger）
 *   3. 所有基础组件（NavBar, Card, Buttons, Chips, Fields…）
 *   4. 完整屏幕实现：
 *        OnboardingScreen  — 全屏暗色动效引导
 *        IntakeBirthScreen — 表单 + 城市选择器
 *        IntakeFocusScreen — 关注点选择
 *        IntakeRoleScreen  — 角色选择
 *        GeneratingScreen  — 脉冲动效 + 进度文字
 *        ResultScreen      — 英雄卡 + 卡片叠入
 *        HomeScreen        — 首页完整布局
 *        PremiumScreen     — Paywall 设计
 *        MeScreen          — 个人设置
 *   5. AppTabBar — 毛玻璃底栏 + 选中动效
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  Layout,
  SlideInRight,
  SlideOutLeft,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";

// ─────────────────────────────────────────────────────────────────────────────
// §1 — DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

export const C = {
  // Backgrounds
  bg: "#F2F2F7",
  bgCard: "rgba(255,255,255,0.82)",
  bgCardDark: "rgba(44,44,46,0.92)",
  bgElevated: "#FFFFFF",
  bgInput: "rgba(118,118,128,0.09)",

  // Labels
  label: "#000000",
  label2: "rgba(60,60,67,0.60)",
  label3: "rgba(60,60,67,0.30)",
  label4: "rgba(60,60,67,0.18)",

  // Separators
  sep: "rgba(60,60,67,0.22)",
  sepOpaque: "#C6C6C8",

  // Brand — near-black system
  ink: "#1C1C1E",
  ink2: "#2C2C2E",
  ink3: "#3A3A3C",
  inkInverse: "#FFFFFF",

  // Accent (system blue for interactive elements)
  blue: "#007AFF",
  blueLight: "rgba(0,122,255,0.12)",

  // Gold (premium badge only)
  gold: "#C6922A",
  goldBg: "rgba(198,146,42,0.10)",

  // Semantic
  success: "#34C759",
  warning: "#FF9500",
  danger: "#FF3B30",

  // Dark hero gradients
  hero0: "#0A0A0C",
  hero1: "#1C1C1E",
  hero2: "#2C2C2E",

  // Blur tints
  blurLight: "rgba(242,242,247,0.90)",
  blurDark: "rgba(10,10,12,0.88)",
} as const;

export const F = {
  // SF Pro Display sizing scale (system font on iOS)
  d1: { fontSize: 38, fontWeight: "700" as const, letterSpacing: -0.5, lineHeight: 44 },
  d2: { fontSize: 30, fontWeight: "700" as const, letterSpacing: -0.4, lineHeight: 36 },
  t1: { fontSize: 24, fontWeight: "700" as const, letterSpacing: -0.3, lineHeight: 30 },
  t2: { fontSize: 20, fontWeight: "600" as const, letterSpacing: -0.2, lineHeight: 26 },
  hl: { fontSize: 17, fontWeight: "600" as const, letterSpacing: -0.4, lineHeight: 22 },
  bd: { fontSize: 17, fontWeight: "400" as const, letterSpacing: -0.4, lineHeight: 24 },
  cl: { fontSize: 16, fontWeight: "400" as const, letterSpacing: -0.3, lineHeight: 22 },
  sh: { fontSize: 15, fontWeight: "400" as const, letterSpacing: -0.2, lineHeight: 20 },
  fn: { fontSize: 13, fontWeight: "400" as const, letterSpacing: -0.1, lineHeight: 18 },
  cp: { fontSize: 12, fontWeight: "400" as const, letterSpacing: 0,    lineHeight: 16 },
  c2: { fontSize: 11, fontWeight: "400" as const, letterSpacing: 0.07, lineHeight: 15 },
} as const;

export const R = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 32,
  xxxl: 38,
  full: 9999,
} as const;

export const S = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

// Reusable shadow presets
export const Shadow = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 5,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 32,
    elevation: 10,
  },
  hero: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.22,
    shadowRadius: 40,
    elevation: 16,
  },
} as const;

const { width: W, height: H } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────
// §2 — ANIMATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Spring config presets */
export const Spring = {
  gentle: { damping: 20, stiffness: 180 },
  snappy: { damping: 16, stiffness: 260 },
  bouncy: { damping: 12, stiffness: 300 },
  slow:   { damping: 28, stiffness: 120 },
} as const;

/** Stagger delay for list reveals (ms) */
export function staggerDelay(index: number, base = 60): number {
  return index * base;
}

/** Pressable with spring scale feedback */
export function SpringPressable({
  children,
  onPress,
  style,
  disabled = false,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: object;
  disabled?: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.96, Spring.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, Spring.bouncy);
      }}
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.();
      }}
      disabled={disabled}
      style={style}
    >
      <Animated.View style={animStyle}>{children}</Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// §3 — NAV BAR  (BlurView + safe area)
// ─────────────────────────────────────────────────────────────────────────────

export function NavBar({
  title,
  left,
  right,
  dark = false,
  transparent = false,
}: {
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  dark?: boolean;
  transparent?: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <BlurView
      intensity={transparent ? 0 : 88}
      tint={dark ? "dark" : "light"}
      style={[
        styles.navBar,
        {
          paddingTop: insets.top + 6,
          borderBottomColor: dark
            ? "rgba(255,255,255,0.08)"
            : C.sep,
        },
      ]}
    >
      <View style={styles.navLeft}>{left}</View>
      <Animated.Text
        entering={FadeIn.duration(220)}
        style={[styles.navTitle, { color: dark ? C.inkInverse : C.label }]}
        numberOfLines={1}
      >
        {title}
      </Animated.Text>
      <View style={styles.navRight}>{right}</View>
    </BlurView>
  );
}

export function NavBackButton({
  onPress,
  dark = false,
  label = "返回",
}: {
  onPress: () => void;
  dark?: boolean;
  label?: string;
}) {
  return (
    <SpringPressable onPress={onPress}>
      <View style={styles.navBackBtn}>
        <Text style={[styles.navBackChevron, { color: dark ? "rgba(255,255,255,0.75)" : C.blue }]}>
          ‹
        </Text>
        <Text style={[styles.navBackLabel, { color: dark ? "rgba(255,255,255,0.75)" : C.blue }]}>
          {label}
        </Text>
      </View>
    </SpringPressable>
  );
}

export function NavTextButton({
  label,
  onPress,
  dark = false,
  bold = false,
}: {
  label: string;
  onPress: () => void;
  dark?: boolean;
  bold?: boolean;
}) {
  return (
    <SpringPressable onPress={onPress}>
      <Text
        style={[
          styles.navTextBtn,
          {
            color: dark ? "rgba(255,255,255,0.60)" : C.blue,
            fontWeight: bold ? "600" : "400",
          },
        ]}
      >
        {label}
      </Text>
    </SpringPressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// §4 — CARD
// ─────────────────────────────────────────────────────────────────────────────

export function Card({
  children,
  style,
  accent = false,
  entering,
  onPress,
}: {
  children: React.ReactNode;
  style?: object;
  accent?: boolean;
  entering?: typeof FadeInDown;
  onPress?: () => void;
}) {
  const inner = (
    <Animated.View
      entering={entering}
      style={[
        styles.card,
        accent && styles.cardAccent,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <SpringPressable onPress={onPress} style={{ marginBottom: S.md }}>
        {inner}
      </SpringPressable>
    );
  }

  return <View style={{ marginBottom: S.md }}>{inner}</View>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.cardTitle}>{children}</Text>;
}

export function CardSubtitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.cardSubtitle}>{children}</Text>;
}

export function CardBody({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.cardBody, style]}>{children}</Text>;
}

// ─────────────────────────────────────────────────────────────────────────────
// §5 — HERO CARD  (dark gradient)
// ─────────────────────────────────────────────────────────────────────────────

export function HeroCard({
  children,
  style,
  entering,
}: {
  children: React.ReactNode;
  style?: object;
  entering?: typeof FadeInDown;
}) {
  return (
    <Animated.View entering={entering} style={[styles.heroWrap, style]}>
      <LinearGradient
        colors={[C.hero0, C.hero2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
        style={styles.heroGradient}
      >
        {children}
      </LinearGradient>
    </Animated.View>
  );
}

export function HeroEyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={styles.heroEyebrow}>{children}</Text>;
}

export function HeroTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.heroTitle}>{children}</Text>;
}

export function HeroBody({ children }: { children: React.ReactNode }) {
  return <Text style={styles.heroBody}>{children}</Text>;
}

export function HeroInfoStrip({
  left,
  right,
  bottom,
}: {
  left: { label: string; value: string };
  right: { label: string; value: string };
  bottom?: string;
}) {
  return (
    <View style={styles.heroStrip}>
      <View>
        <Text style={styles.heroStripLabel}>{left.label}</Text>
        <Text style={styles.heroStripValue}>{left.value}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.heroStripLabel}>{right.label}</Text>
        <Text style={styles.heroStripValue}>{right.value}</Text>
      </View>
      {bottom && (
        <View style={styles.heroStripBottom}>
          <Text style={styles.heroStripBottomText}>{bottom}</Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// §6 — BUTTONS
// ─────────────────────────────────────────────────────────────────────────────

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  dark = false,
  loading = false,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  dark?: boolean;
  loading?: boolean;
  style?: object;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(scale.value, [0.96, 1], [0.88, 1]),
  }));

  return (
    <Pressable
      onPressIn={() => {
        if (!disabled) scale.value = withSpring(0.97, Spring.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, Spring.bouncy);
      }}
      onPress={() => {
        if (!disabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }
      }}
      disabled={disabled}
      style={style}
    >
      <Animated.View
        style={[
          styles.primaryBtn,
          dark
            ? { backgroundColor: disabled ? "rgba(255,255,255,0.30)" : C.inkInverse }
            : { backgroundColor: disabled ? C.sepOpaque : C.ink },
          animStyle,
        ]}
      >
        <Text
          style={[
            styles.primaryBtnLabel,
            { color: dark ? C.ink : C.inkInverse },
          ]}
        >
          {loading ? "请稍候…" : label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: object;
}) {
  return (
    <SpringPressable onPress={onPress} style={style}>
      <View style={styles.secondaryBtn}>
        <Text style={styles.secondaryBtnLabel}>{label}</Text>
      </View>
    </SpringPressable>
  );
}

export function GhostButton({
  label,
  onPress,
  dark = false,
}: {
  label: string;
  onPress: () => void;
  dark?: boolean;
}) {
  return (
    <SpringPressable onPress={onPress}>
      <Text
        style={[
          styles.ghostBtnLabel,
          { color: dark ? "rgba(255,255,255,0.50)" : C.label3 },
        ]}
      >
        {label}
      </Text>
    </SpringPressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// §7 — PILL CHIPS  (focus / role selection)
// ─────────────────────────────────────────────────────────────────────────────

export function PillChip({
  label,
  active,
  onPress,
  dark = false,
  index = 0,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  dark?: boolean;
  index?: number;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(staggerDelay(index, 45)).springify()}
      style={animStyle}
    >
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.94, Spring.snappy);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, Spring.bouncy);
        }}
        onPress={() => {
          Haptics.selectionAsync();
          onPress();
        }}
        style={[
          styles.pillChip,
          active
            ? {
                backgroundColor: dark ? C.inkInverse : C.ink,
                borderColor: "transparent",
              }
            : {
                backgroundColor: dark ? "rgba(255,255,255,0.08)" : C.bgElevated,
                borderColor: dark ? "rgba(255,255,255,0.15)" : C.sepOpaque,
              },
        ]}
      >
        <Text
          style={[
            styles.pillChipLabel,
            {
              color: active
                ? dark
                  ? C.ink
                  : C.inkInverse
                : dark
                ? "rgba(255,255,255,0.80)"
                : C.label,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function ChipGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.chipGrid}>{children}</View>;
}

// ─────────────────────────────────────────────────────────────────────────────
// §8 — SEGMENTED CONTROL
// ─────────────────────────────────────────────────────────────────────────────

export function SegmentedControl({
  options,
  selected,
  onChange,
}: {
  options: { value: string; label: string }[];
  selected: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.segTrack}>
      {options.map((opt) => {
        const active = opt.value === selected;
        return (
          <SpringPressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{ flex: 1 }}
          >
            <View style={[styles.segOption, active && styles.segOptionActive]}>
              <Text
                style={[
                  styles.segLabel,
                  active && styles.segLabelActive,
                ]}
              >
                {opt.label}
              </Text>
            </View>
          </SpringPressable>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// §9 — FORM FIELDS
// ─────────────────────────────────────────────────────────────────────────────

export function FieldLabel({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <Text
      style={[
        styles.fieldLabel,
        { color: dark ? "rgba(255,255,255,0.50)" : C.label2 },
      ]}
    >
      {children}
    </Text>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  helper,
  keyboardType = "default",
  returnKeyType = "done",
  dark = false,
  entering,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  helper?: string;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  returnKeyType?: "done" | "next" | "go";
  dark?: boolean;
  entering?: typeof FadeInDown;
}) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    borderColor: focused
      ? withTiming(dark ? "rgba(255,255,255,0.35)" : C.ink, { duration: 180 })
      : withTiming(dark ? "rgba(255,255,255,0.12)" : C.sepOpaque, {
          duration: 180,
        }),
  }));

  return (
    <Animated.View entering={entering} style={styles.fieldWrap}>
      <FieldLabel dark={dark}>{label}</FieldLabel>
      <Animated.View style={[styles.fieldInputWrap, animStyle]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={
            dark ? "rgba(255,255,255,0.28)" : C.label3
          }
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.fieldInput,
            {
              color: dark ? C.inkInverse : C.label,
              backgroundColor: dark
                ? "rgba(255,255,255,0.06)"
                : C.bgInput,
            },
          ]}
        />
      </Animated.View>
      {helper && (
        <Text
          style={[
            styles.fieldHelper,
            { color: dark ? "rgba(255,255,255,0.35)" : C.label3 },
          ]}
        >
          {helper}
        </Text>
      )}
    </Animated.View>
  );
}

/** Tappable field (opens picker / modal) */
export function TapField({
  label,
  value,
  placeholder,
  onPress,
  helper,
  dark = false,
}: {
  label: string;
  value?: string;
  placeholder: string;
  onPress: () => void;
  helper?: string;
  dark?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <FieldLabel dark={dark}>{label}</FieldLabel>
      <SpringPressable onPress={onPress}>
        <View
          style={[
            styles.fieldInputWrap,
            styles.fieldInput,
            {
              backgroundColor: dark ? "rgba(255,255,255,0.06)" : C.bgInput,
              borderColor: dark
                ? "rgba(255,255,255,0.12)"
                : C.sepOpaque,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            },
          ]}
        >
          <Text
            style={[
              F.sh,
              {
                color: value
                  ? dark
                    ? C.inkInverse
                    : C.label
                  : dark
                  ? "rgba(255,255,255,0.28)"
                  : C.label3,
              },
            ]}
          >
            {value || placeholder}
          </Text>
          <Text
            style={{
              color: dark ? "rgba(255,255,255,0.35)" : C.label3,
              fontSize: 18,
            }}
          >
            ›
          </Text>
        </View>
      </SpringPressable>
      {helper && (
        <Text
          style={[
            styles.fieldHelper,
            { color: dark ? "rgba(255,255,255,0.35)" : C.label3 },
          ]}
        >
          {helper}
        </Text>
      )}
    </View>
  );
}

export function SwitchRow({
  label,
  value,
  onChange,
  subtitle,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  subtitle?: string;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1, marginRight: S.md }}>
        <Text style={[F.sh, { color: C.label }]}>{label}</Text>
        {subtitle && (
          <Text style={[F.cp, { color: C.label2, marginTop: 2 }]}>
            {subtitle}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          Haptics.selectionAsync();
          onChange(v);
        }}
        trackColor={{ false: C.bgInput, true: C.ink }}
        thumbColor={C.inkInverse}
        ios_backgroundColor={C.bgInput}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// §10 — BOTTOM BAR  (BlurView)
// ─────────────────────────────────────────────────────────────────────────────

export function BottomBar({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <BlurView
      intensity={90}
      tint={dark ? "dark" : "light"}
      style={[
        styles.bottomBar,
        {
          paddingBottom: insets.bottom + 10,
          borderTopColor: dark
            ? "rgba(255,255,255,0.08)"
            : C.sep,
        },
      ]}
    >
      {children}
    </BlurView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// §11 — LIST ROW
// ─────────────────────────────────────────────────────────────────────────────

export function ListRow({
  label,
  onPress,
  rightLabel,
  rightElement,
  showChevron = true,
  destructive = false,
}: {
  label: string;
  onPress?: () => void;
  rightLabel?: string;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  destructive?: boolean;
}) {
  return (
    <SpringPressable onPress={onPress}>
      <View style={styles.listRow}>
        <Text
          style={[
            styles.listRowLabel,
            destructive && { color: C.danger },
          ]}
        >
          {label}
        </Text>
        <View style={styles.listRowRight}>
          {rightElement}
          {rightLabel && (
            <Text style={styles.listRowRightLabel}>{rightLabel}</Text>
          )}
          {showChevron && (
            <Text style={styles.listRowChevron}>›</Text>
          )}
        </View>
      </View>
    </SpringPressable>
  );
}

export function InCardDivider() {
  return <View style={styles.inCardDivider} />;
}

export function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

// ─────────────────────────────────────────────────────────────────────────────
// §12 — PROGRESS DOTS  (onboarding)
// ─────────────────────────────────────────────────────────────────────────────

export function ProgressDots({
  total,
  current,
  dark = true,
}: {
  total: number;
  current: number;
  dark?: boolean;
}) {
  return (
    <View style={styles.progressDots}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i <= current;
        const width = useSharedValue(active ? 24 : 6);
        useEffect(() => {
          width.value = withSpring(i === current ? 24 : i < current ? 14 : 6, Spring.gentle);
        }, [current]);
        const animStyle = useAnimatedStyle(() => ({ width: width.value }));
        return (
          <Animated.View
            key={i}
            style={[
              styles.progressDot,
              animStyle,
              {
                backgroundColor: active
                  ? dark
                    ? C.inkInverse
                    : C.ink
                  : dark
                  ? "rgba(255,255,255,0.22)"
                  : C.sepOpaque,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// §13 — CITY PICKER MODAL
// ─────────────────────────────────────────────────────────────────────────────

type CityRecord = {
  province: string;
  city: string;
  lat: number;
  lon: number;
  tz: string;
};

// Sample data — replace with full 333+370 dataset from MingMeV2_ReactNative.tsx
const CHINA_PROVINCES = [
  "北京市","天津市","上海市","重庆市","河北省","山西省","辽宁省","吉林省",
  "黑龙江省","江苏省","浙江省","安徽省","福建省","江西省","山东省","河南省",
  "湖北省","湖南省","广东省","海南省","四川省","贵州省","云南省","陕西省",
  "甘肃省","青海省","内蒙古自治区","广西壮族自治区","西藏自治区",
  "新疆维吾尔自治区","宁夏回族自治区",
];

const SAMPLE_CITIES: CityRecord[] = [
  { province: "北京市",    city: "北京",   lat: 39.9042, lon: 116.4074, tz: "Asia/Shanghai" },
  { province: "上海市",    city: "上海",   lat: 31.2304, lon: 121.4737, tz: "Asia/Shanghai" },
  { province: "山东省",    city: "济南",   lat: 36.6512, lon: 117.1201, tz: "Asia/Shanghai" },
  { province: "山东省",    city: "青岛",   lat: 36.0671, lon: 120.3826, tz: "Asia/Shanghai" },
  { province: "山东省",    city: "烟台",   lat: 37.5365, lon: 121.3919, tz: "Asia/Shanghai" },
  { province: "山东省",    city: "威海",   lat: 37.5135, lon: 122.1200, tz: "Asia/Shanghai" },
  { province: "山东省",    city: "临沂",   lat: 35.1047, lon: 118.3564, tz: "Asia/Shanghai" },
  { province: "广东省",    city: "广州",   lat: 23.1291, lon: 113.2644, tz: "Asia/Shanghai" },
  { province: "广东省",    city: "深圳",   lat: 22.5431, lon: 114.0579, tz: "Asia/Shanghai" },
  { province: "广东省",    city: "佛山",   lat: 23.0219, lon: 113.1219, tz: "Asia/Shanghai" },
  { province: "浙江省",    city: "杭州",   lat: 30.2741, lon: 120.1551, tz: "Asia/Shanghai" },
  { province: "浙江省",    city: "宁波",   lat: 29.8683, lon: 121.5440, tz: "Asia/Shanghai" },
  { province: "浙江省",    city: "温州",   lat: 28.0000, lon: 120.6722, tz: "Asia/Shanghai" },
  { province: "江苏省",    city: "南京",   lat: 32.0603, lon: 118.7969, tz: "Asia/Shanghai" },
  { province: "江苏省",    city: "苏州",   lat: 31.2989, lon: 120.5853, tz: "Asia/Shanghai" },
  { province: "四川省",    city: "成都",   lat: 30.5728, lon: 104.0668, tz: "Asia/Shanghai" },
  { province: "湖北省",    city: "武汉",   lat: 30.5928, lon: 114.3055, tz: "Asia/Shanghai" },
  { province: "陕西省",    city: "西安",   lat: 34.3416, lon: 108.9398, tz: "Asia/Shanghai" },
  { province: "重庆市",    city: "重庆",   lat: 29.5630, lon: 106.5516, tz: "Asia/Shanghai" },
  { province: "新疆维吾尔自治区", city: "乌鲁木齐", lat: 43.8256, lon: 87.6168, tz: "Asia/Urumqi" },
];

const GLOBAL_CITIES: CityRecord[] = [
  { province: "美国", city: "纽约", lat: 40.7128, lon: -74.0060, tz: "America/New_York" },
  { province: "美国", city: "洛杉矶", lat: 34.0522, lon: -118.2437, tz: "America/Los_Angeles" },
  { province: "美国", city: "旧金山", lat: 37.7749, lon: -122.4194, tz: "America/Los_Angeles" },
  { province: "英国", city: "伦敦", lat: 51.5074, lon: -0.1278, tz: "Europe/London" },
  { province: "日本", city: "东京", lat: 35.6762, lon: 139.6503, tz: "Asia/Tokyo" },
  { province: "日本", city: "大阪", lat: 34.6937, lon: 135.5022, tz: "Asia/Tokyo" },
  { province: "新加坡", city: "新加坡", lat: 1.3521, lon: 103.8198, tz: "Asia/Singapore" },
  { province: "澳大利亚", city: "悉尼", lat: -33.8688, lon: 151.2093, tz: "Australia/Sydney" },
  { province: "澳大利亚", city: "墨尔本", lat: -37.8136, lon: 144.9631, tz: "Australia/Melbourne" },
  { province: "加拿大", city: "多伦多", lat: 43.6532, lon: -79.3832, tz: "America/Toronto" },
  { province: "加拿大", city: "温哥华", lat: 49.2827, lon: -123.1207, tz: "America/Vancouver" },
  { province: "德国", city: "柏林", lat: 52.5200, lon: 13.4050, tz: "Europe/Berlin" },
  { province: "法国", city: "巴黎", lat: 48.8566, lon: 2.3522, tz: "Europe/Paris" },
  { province: "韩国", city: "首尔", lat: 37.5665, lon: 126.9780, tz: "Asia/Seoul" },
  { province: "香港", city: "香港", lat: 22.3193, lon: 114.1694, tz: "Asia/Hong_Kong" },
  { province: "台湾", city: "台北", lat: 25.0330, lon: 121.5654, tz: "Asia/Taipei" },
  { province: "马来西亚", city: "吉隆坡", lat: 3.1390, lon: 101.6869, tz: "Asia/Kuala_Lumpur" },
  { province: "泰国", city: "曼谷", lat: 13.7563, lon: 100.5018, tz: "Asia/Bangkok" },
  { province: "阿联酋", city: "迪拜", lat: 25.2048, lon: 55.2708, tz: "Asia/Dubai" },
  { province: "荷兰", city: "阿姆斯特丹", lat: 52.3676, lon: 4.9041, tz: "Europe/Amsterdam" },
];

export function CityPickerModal({
  visible,
  onClose,
  onSelect,
  initialProvince = "山东省",
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (province: string, city: string) => void;
  initialProvince?: string;
}) {
  const insets = useSafeAreaInsets();
  const [province, setProvince] = useState(initialProvince);
  const [search, setSearch] = useState("");
  const [showGlobal, setShowGlobal] = useState(false);

  const citiesInProvince = SAMPLE_CITIES.filter(
    (c) => c.province === province
  );

  const searchResults =
    search.trim().length > 0
      ? [...SAMPLE_CITIES, ...GLOBAL_CITIES].filter(
          (c) =>
            c.city.includes(search) || c.province.includes(search)
        )
      : [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
        {/* Header */}
        <BlurView
          intensity={88}
          tint="light"
          style={styles.modalHeader}
        >
          <Text style={styles.modalTitle}>选择出生城市</Text>
          <SpringPressable onPress={onClose}>
            <Text style={[F.sh, { color: C.blue, fontWeight: "600" }]}>
              完成
            </Text>
          </SpringPressable>
        </BlurView>

        {/* Search */}
        <View style={styles.modalSearch}>
          <View style={styles.modalSearchInner}>
            <Text style={{ color: C.label3, marginRight: S.sm }}>🔍</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="搜索省份或城市"
              placeholderTextColor={C.label3}
              style={[F.sh, { flex: 1, color: C.label }]}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <SpringPressable onPress={() => setSearch("")}>
                <Text style={{ color: C.label3, fontSize: 16 }}>✕</Text>
              </SpringPressable>
            )}
          </View>
        </View>

        {search.trim().length > 0 ? (
          /* Search results */
          <FlatList
            data={searchResults}
            keyExtractor={(item) => `${item.province}-${item.city}`}
            ItemSeparatorComponent={() => (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: C.sep,
                  marginLeft: S.lg,
                }}
              />
            )}
            renderItem={({ item }) => (
              <ListRow
                label={`${item.city}`}
                rightLabel={item.province}
                onPress={() => {
                  onSelect(item.province, item.city);
                  setSearch("");
                  onClose();
                }}
              />
            )}
          />
        ) : (
          /* Two-column province → city */
          <View style={styles.cityColumns}>
            {/* Province list */}
            <ScrollView
              style={styles.provinceList}
              showsVerticalScrollIndicator={false}
            >
              {CHINA_PROVINCES.map((p) => {
                const active = p === province && !showGlobal;
                return (
                  <SpringPressable
                    key={p}
                    onPress={() => {
                      setProvince(p);
                      setShowGlobal(false);
                    }}
                  >
                    <View
                      style={[
                        styles.provinceItem,
                        active && styles.provinceItemActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.provinceItemLabel,
                          active && styles.provinceItemLabelActive,
                        ]}
                        numberOfLines={2}
                      >
                        {p
                          .replace("自治区", "")
                          .replace("壮族", "")
                          .replace("维吾尔", "")
                          .replace("回族", "")}
                      </Text>
                    </View>
                  </SpringPressable>
                );
              })}

              {/* Divider */}
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: C.sep,
                  marginVertical: S.xs,
                }}
              />

              {/* Global */}
              <SpringPressable onPress={() => setShowGlobal(true)}>
                <View
                  style={[
                    styles.provinceItem,
                    showGlobal && styles.provinceItemActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.provinceItemLabel,
                      showGlobal && styles.provinceItemLabelActive,
                    ]}
                  >
                    海外城市
                  </Text>
                </View>
              </SpringPressable>
            </ScrollView>

            {/* City list */}
            <ScrollView
              style={styles.cityList}
              showsVerticalScrollIndicator={false}
            >
              {(showGlobal ? GLOBAL_CITIES : citiesInProvince).map(
                (c, i) => (
                  <React.Fragment key={c.city}>
                    <SpringPressable
                      onPress={() => {
                        Haptics.impactAsync(
                          Haptics.ImpactFeedbackStyle.Light
                        );
                        onSelect(c.province, c.city);
                        onClose();
                      }}
                    >
                      <View style={styles.cityItem}>
                        <Text style={styles.cityItemLabel}>
                          {c.city}
                        </Text>
                        {showGlobal && (
                          <Text style={styles.cityItemSub}>
                            {c.province}
                          </Text>
                        )}
                      </View>
                    </SpringPressable>
                    {i <
                      (showGlobal ? GLOBAL_CITIES : citiesInProvince)
                        .length -
                        1 && (
                      <View
                        style={{
                          height: StyleSheet.hairlineWidth,
                          backgroundColor: C.sep,
                          marginLeft: S.lg,
                        }}
                      />
                    )}
                  </React.Fragment>
                )
              )}
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// §14 — ONBOARDING SCREEN
// ─────────────────────────────────────────────────────────────────────────────

const ONBOARDING_DATA = [
  {
    step: "01",
    title: "认识自己，是一切改变的开始",
    body: "明己帮助你看见自己的特质、阶段与节奏，在更清楚的状态下做出选择。",
    action: "开始了解自己",
  },
  {
    step: "02",
    title: "你会在这里看懂三件事",
    body: "看见自己，看懂阶段，做出选择。不是分析工具，而是让你更完整地理解自己。",
    action: "继续",
  },
  {
    step: "03",
    title: "当你处在这些时刻，明己会更有用",
    body: "很努力，却越来越没方向；在关系里反复拉扯；做选择时犹豫或冲动。",
    action: "这正是我需要的",
  },
  {
    step: "04",
    title: "不是给你贴标签，而是帮你更理解自己",
    body: "明己会把复杂的信息，转成更现代、更易懂的表达方式。",
    action: "开始生成我的档案",
  },
] as const;

export function OnboardingScreen({ onFinish }: { onFinish: () => void }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const current = ONBOARDING_DATA[step];

  // Particle-like ambient dots
  const p1 = useSharedValue(0);
  const p2 = useSharedValue(0);
  useEffect(() => {
    p1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3200, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
    p2.value = withDelay(
      1600,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.sin) })
        ),
        -1
      )
    );
  }, []);

  const p1Style = useAnimatedStyle(() => ({
    opacity: interpolate(p1.value, [0, 1], [0.04, 0.10]),
    transform: [{ translateY: interpolate(p1.value, [0, 1], [0, -18]) }],
  }));
  const p2Style = useAnimatedStyle(() => ({
    opacity: interpolate(p2.value, [0, 1], [0.03, 0.08]),
    transform: [{ translateY: interpolate(p2.value, [0, 1], [0, 14]) }],
  }));

  const advance = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < ONBOARDING_DATA.length - 1) {
      setStep((s) => s + 1);
    } else {
      onFinish();
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: C.hero0 }]}>
      {/* Ambient light blobs */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 280,
            height: 280,
            borderRadius: 140,
            backgroundColor: "rgba(255,255,255,0.06)",
            top: H * 0.12,
            left: -60,
          },
          p1Style,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: "rgba(255,255,255,0.04)",
            bottom: H * 0.25,
            right: -40,
          },
          p2Style,
        ]}
      />

      {/* Skip */}
      <View
        style={[
          styles.onbSkipRow,
          { paddingTop: insets.top + 10 },
        ]}
      >
        <NavTextButton label="跳过" onPress={onFinish} dark />
      </View>

      {/* Progress */}
      <View style={{ paddingHorizontal: S.lg, marginTop: S.xxl }}>
        <ProgressDots total={ONBOARDING_DATA.length} current={step} dark />
      </View>

      {/* Content — key forces remount animation */}
      <Animated.View
        key={step}
        entering={FadeInDown.duration(340).springify()}
        style={styles.onbContent}
      >
        <Text style={styles.onbStepNum}>{current.step}</Text>
        <Text style={styles.onbTitle}>{current.title}</Text>
        <Text style={styles.onbBody}>{current.body}</Text>
      </Animated.View>

      {/* CTA */}
      <BottomBar dark>
        <PrimaryButton
          label={current.action}
          onPress={advance}
          dark
          style={{ width: "100%" }}
        />
        {step > 0 && (
          <View style={{ marginTop: S.md, alignItems: "center" }}>
            <GhostButton
              label="上一步"
              onPress={() => setStep((s) => s - 1)}
              dark
            />
          </View>
        )}
      </BottomBar>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// §15 — GENERATING SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export function GeneratingScreen({ statusText }: { statusText: string }) {
  // Orb pulse animation
  const orbScale = useSharedValue(1);
  const orbGlow = useSharedValue(0);
  const ring1 = useSharedValue(0.6);
  const ring2 = useSharedValue(0.4);

  useEffect(() => {
    orbScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
    orbGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
    ring1.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) }),
      -1
    );
    ring2.value = withDelay(
      800,
      withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) }),
        -1
      )
    );
  }, []);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
    shadowOpacity: interpolate(orbGlow.value, [0, 1], [0.15, 0.38]),
  }));
  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring1.value, [0, 1], [0.7, 1.5]) }],
    opacity: interpolate(ring1.value, [0, 0.3, 1], [0, 0.2, 0]),
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring2.value, [0, 1], [0.7, 1.5]) }],
    opacity: interpolate(ring2.value, [0, 0.3, 1], [0, 0.15, 0]),
  }));

  return (
    <View style={[styles.screen, styles.centred, { backgroundColor: C.bg }]}>
      {/* Ripple rings */}
      <Animated.View style={[styles.genRing, ring1Style]} />
      <Animated.View style={[styles.genRing, ring2Style]} />

      {/* Orb */}
      <Animated.View style={[styles.genOrb, orbStyle]} />

      <Animated.Text
        entering={FadeInUp.delay(200).duration(400)}
        style={styles.genTitle}
      >
        正在为你生成专属档案
      </Animated.Text>

      <Animated.Text
        key={statusText}
        entering={FadeIn.duration(300)}
        style={styles.genStatus}
      >
        {statusText}
      </Animated.Text>

      {/* Animated progress dots */}
      <View style={{ flexDirection: "row", gap: 6, marginTop: S.xxl }}>
        {[0, 1, 2].map((i) => {
          const dot = useSharedValue(0.4);
          useEffect(() => {
            dot.value = withDelay(
              i * 220,
              withRepeat(
                withSequence(
                  withTiming(1, { duration: 400 }),
                  withTiming(0.4, { duration: 400 })
                ),
                -1
              )
            );
          }, []);
          const dStyle = useAnimatedStyle(() => ({ opacity: dot.value }));
          return (
            <Animated.View
              key={i}
              style={[
                { width: 7, height: 7, borderRadius: 4, backgroundColor: C.ink },
                dStyle,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// §16 — APP TAB BAR  (BlurView + active indicator)
// ─────────────────────────────────────────────────────────────────────────────

export type TabKey = "home" | "profile" | "stage" | "premium" | "me";

const TAB_CONFIG: Array<{
  key: TabKey;
  label: string;
  icon: string;
  activeIcon: string;
}> = [
  { key: "home",    label: "首页", icon: "⌂",  activeIcon: "⌂" },
  { key: "profile", label: "明己", icon: "◉",  activeIcon: "◉" },
  { key: "stage",   label: "阶段", icon: "◎",  activeIcon: "◎" },
  { key: "premium", label: "会员", icon: "◇",  activeIcon: "◆" },
  { key: "me",      label: "我的", icon: "◌",  activeIcon: "●" },
];

export function AppTabBar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (t: TabKey) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <BlurView
      intensity={92}
      tint="light"
      style={[
        styles.tabBar,
        { paddingBottom: insets.bottom + 6 },
      ]}
    >
      {TAB_CONFIG.map((tab) => {
        const isActive = active === tab.key;
        return (
          <TabItem
            key={tab.key}
            tab={tab}
            isActive={isActive}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(tab.key);
            }}
          />
        );
      })}
    </BlurView>
  );
}

function TabItem({
  tab,
  isActive,
  onPress,
}: {
  tab: (typeof TAB_CONFIG)[0];
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const iconBg = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    iconBg.value = withSpring(isActive ? 1 : 0, Spring.gentle);
  }, [isActive]);

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(28,28,30,${iconBg.value * 1})`,
    transform: [{ scale: interpolate(iconBg.value, [0, 1], [0.85, 1]) }],
  }));
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.88, Spring.snappy); }}
      onPressOut={() => { scale.value = withSpring(1, Spring.bouncy); }}
      onPress={onPress}
      style={styles.tabItem}
    >
      <Animated.View style={scaleStyle}>
        <Animated.View style={[styles.tabIconWrap, bgStyle]}>
          <Text
            style={[
              styles.tabIconText,
              {
                color: isActive ? C.inkInverse : C.label3,
              },
            ]}
          >
            {isActive ? tab.activeIcon : tab.icon}
          </Text>
        </Animated.View>
        <Text
          style={[
            styles.tabLabel,
            {
              color: isActive ? C.ink : C.label2,
              fontWeight: isActive ? "600" : "400",
            },
          ]}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// §17 — PREMIUM / PAYWALL SCREEN  (full design)
// ─────────────────────────────────────────────────────────────────────────────

export function PremiumScreen({ onClose }: { onClose?: () => void }) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<"monthly" | "annual">("annual");

  const FEATURES = [
    { icon: "◉", title: "完整个人档案", body: "深度理解核心特质、优势、消耗点与决策倾向" },
    { icon: "◎", title: "阶段地图",     body: "当前阶段、接下来重点变化与关键节奏提醒" },
    { icon: "◌", title: "每周 / 每月提醒", body: "持续获得更贴近日常生活的节奏与行动建议" },
    { icon: "◇", title: "关系分析",     body: "看懂互动模式，减少重复误解与情绪拉扯" },
    { icon: "—",  title: "深度解读",    body: "知道一点，会安慰自己。看得完整，才能真正改变" },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero */}
        <LinearGradient
          colors={[C.hero0, C.hero2, "#1A1A2E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.premiumHero, { paddingTop: insets.top + 20 }]}
        >
          {onClose && (
            <View style={styles.premiumCloseRow}>
              <SpringPressable onPress={onClose}>
                <View style={styles.premiumCloseBtn}>
                  <Text style={{ color: C.inkInverse, fontSize: 16 }}>✕</Text>
                </View>
              </SpringPressable>
            </View>
          )}

          <Animated.Text
            entering={FadeInDown.delay(100).springify()}
            style={styles.premiumEyebrow}
          >
            明己 会员
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(160).springify()}
            style={styles.premiumTitle}
          >
            解锁更完整的自己
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(220).springify()}
            style={styles.premiumSubtitle}
          >
            不只看到结果，也看见背后的原因与路径。
          </Animated.Text>

          {/* Gold star row */}
          <Animated.View
            entering={FadeIn.delay(300).duration(400)}
            style={styles.premiumStars}
          >
            {["★", "★", "★", "★", "★"].map((s, i) => (
              <Text key={i} style={{ color: C.gold, fontSize: 16 }}>
                {s}
              </Text>
            ))}
            <Text style={[F.cp, { color: "rgba(255,255,255,0.55)", marginLeft: 6 }]}>
              4.9 · 3,200+ 评分
            </Text>
          </Animated.View>
        </LinearGradient>

        {/* Features */}
        <View style={{ paddingHorizontal: S.lg, paddingTop: S.xl, gap: S.sm }}>
          {FEATURES.map((f, i) => (
            <Animated.View
              key={f.title}
              entering={FadeInDown.delay(i * 55).springify()}
            >
              <Card>
                <View style={styles.premiumFeatureRow}>
                  <View style={styles.premiumFeatureIcon}>
                    <Text style={{ color: C.ink, fontSize: 14 }}>{f.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[F.hl, { color: C.label }]}>{f.title}</Text>
                    <Text
                      style={[
                        F.fn,
                        { color: C.label2, marginTop: 3, lineHeight: 18 },
                      ]}
                    >
                      {f.body}
                    </Text>
                  </View>
                </View>
              </Card>
            </Animated.View>
          ))}
        </View>

        {/* Plan selector */}
        <View style={{ paddingHorizontal: S.lg, marginTop: S.xl }}>
          <Text
            style={[
              F.fn,
              {
                color: C.label2,
                textAlign: "center",
                marginBottom: S.md,
                fontWeight: "500",
                letterSpacing: 0.5,
                textTransform: "uppercase",
              },
            ]}
          >
            选择计划
          </Text>

          <View style={{ gap: S.md }}>
            {/* Annual */}
            <SpringPressable onPress={() => setSelected("annual")}>
              <View
                style={[
                  styles.planCard,
                  selected === "annual" && styles.planCardSelected,
                ]}
              >
                <View style={styles.planCardLeft}>
                  <View style={styles.planRadio}>
                    {selected === "annual" && (
                      <View style={styles.planRadioFill} />
                    )}
                  </View>
                  <View>
                    <View style={{ flexDirection: "row", gap: S.sm, alignItems: "center" }}>
                      <Text style={[F.hl, { color: C.label }]}>年会员</Text>
                      <View style={styles.planBadge}>
                        <Text style={styles.planBadgeLabel}>推荐 · 省 58%</Text>
                      </View>
                    </View>
                    <Text style={[F.fn, { color: C.label2, marginTop: 2 }]}>
                      适合长期陪伴使用
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[F.t1, { color: C.label }]}>¥168</Text>
                  <Text style={[F.cp, { color: C.label3 }]}>/ 年</Text>
                </View>
              </View>
            </SpringPressable>

            {/* Monthly */}
            <SpringPressable onPress={() => setSelected("monthly")}>
              <View
                style={[
                  styles.planCard,
                  selected === "monthly" && styles.planCardSelected,
                ]}
              >
                <View style={styles.planCardLeft}>
                  <View style={styles.planRadio}>
                    {selected === "monthly" && (
                      <View style={styles.planRadioFill} />
                    )}
                  </View>
                  <View>
                    <Text style={[F.hl, { color: C.label }]}>月会员</Text>
                    <Text style={[F.fn, { color: C.label2, marginTop: 2 }]}>
                      适合先体验一段时间
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[F.t1, { color: C.label }]}>¥28</Text>
                  <Text style={[F.cp, { color: C.label3 }]}>/ 月</Text>
                </View>
              </View>
            </SpringPressable>
          </View>
        </View>

        <Text
          style={[
            F.cp,
            {
              color: C.label3,
              textAlign: "center",
              marginTop: S.lg,
              paddingHorizontal: S.xxl,
              lineHeight: 17,
            },
          ]}
        >
          付款后可在「我的」→「会员中心」管理订阅。
          {"\n"}订阅将在到期前 24 小时自动续费，可随时取消。
        </Text>
      </ScrollView>

      {/* Sticky subscribe CTA */}
      <BottomBar>
        <PrimaryButton
          label={
            selected === "annual"
              ? "开通年会员 — ¥168 / 年"
              : "开通月会员 — ¥28 / 月"
          }
          onPress={() => {
            // In production: call RevenueCat Purchases.purchasePackage()
          }}
          style={{ width: "100%" }}
        />
        <View style={{ marginTop: S.sm, alignItems: "center" }}>
          <GhostButton label="恢复购买" onPress={() => {}} />
        </View>
      </BottomBar>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// §18 — STYLESHEET
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  centred: { alignItems: "center", justifyContent: "center" },

  // NavBar
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: S.lg,
    paddingBottom: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 100,
  },
  navLeft:  { minWidth: 72, alignItems: "flex-start" },
  navRight: { minWidth: 72, alignItems: "flex-end" },
  navTitle: { ...F.hl, flex: 1, textAlign: "center" },
  navBackBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  navBackChevron: { fontSize: 22, lineHeight: 24, marginTop: -1 },
  navBackLabel: { ...F.bd, fontWeight: "400" },
  navTextBtn: { ...F.sh, paddingVertical: 4, paddingHorizontal: 2 },

  // Card
  card: {
    backgroundColor: C.bgCard,
    borderRadius: R.xl,
    padding: S.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60,60,67,0.10)",
    ...Shadow.md,
  },
  cardAccent: { borderColor: "rgba(28,28,30,0.16)" },
  cardTitle:    { ...F.hl, color: C.label },
  cardSubtitle: { ...F.fn, color: C.label2, marginTop: 4, lineHeight: 18 },
  cardBody:     { ...F.sh, color: C.label2, marginTop: S.sm, lineHeight: 22 },

  // Hero card
  heroWrap: {
    borderRadius: R.xxl,
    overflow: "hidden",
    marginBottom: S.md,
    ...Shadow.hero,
  },
  heroGradient: { padding: S.xxl },
  heroEyebrow: { ...F.fn, color: "rgba(255,255,255,0.50)" },
  heroTitle: { ...F.d2, color: C.inkInverse, marginTop: S.sm, lineHeight: 36 },
  heroBody: {
    ...F.sh,
    color: "rgba(255,255,255,0.70)",
    marginTop: S.md,
    lineHeight: 22,
  },
  heroStrip: {
    marginTop: S.lg,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: R.lg,
    padding: S.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: S.sm,
  },
  heroStripLabel: { ...F.cp, color: "rgba(255,255,255,0.45)" },
  heroStripValue: { ...F.sh, color: C.inkInverse, fontWeight: "600", marginTop: 2 },
  heroStripBottom: {
    width: "100%",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.10)",
    paddingTop: S.sm,
    marginTop: S.xs,
  },
  heroStripBottomText: { ...F.cp, color: "rgba(255,255,255,0.45)" },

  // Buttons
  primaryBtn: {
    height: 52,
    borderRadius: R.full,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.lg,
  },
  primaryBtnLabel: { ...F.hl },
  secondaryBtn: {
    height: 52,
    borderRadius: R.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.sepOpaque,
    backgroundColor: C.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.sm,
  },
  secondaryBtnLabel: { ...F.sh, color: C.label, fontWeight: "600" },
  ghostBtnLabel: { ...F.fn, textAlign: "center" },

  // Pill chip
  pillChip: {
    borderRadius: R.full,
    paddingHorizontal: S.lg,
    paddingVertical: S.sm + 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillChipLabel: { ...F.fn, fontWeight: "500" },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: S.sm,
    marginTop: S.md,
  },

  // Segmented control
  segTrack: {
    flexDirection: "row",
    backgroundColor: "rgba(118,118,128,0.12)",
    borderRadius: R.full,
    padding: 3,
    marginTop: S.xs,
  },
  segOption: {
    flex: 1,
    height: 36,
    borderRadius: R.full,
    alignItems: "center",
    justifyContent: "center",
  },
  segOptionActive: {
    backgroundColor: C.bgElevated,
    ...Shadow.sm,
  },
  segLabel: { ...F.fn, fontWeight: "500", color: C.label2 },
  segLabelActive: { color: C.label, fontWeight: "700" },

  // Form fields
  fieldWrap: { marginTop: S.md },
  fieldLabel: {
    ...F.cp,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: S.xs,
  },
  fieldInputWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: R.md,
    overflow: "hidden",
  },
  fieldInput: {
    height: 50,
    paddingHorizontal: S.md,
    ...F.sh,
  },
  fieldHelper: {
    ...F.cp,
    marginTop: S.xs,
    lineHeight: 16,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: S.sm,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: S.lg,
    paddingTop: S.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  // List
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: S.md,
    paddingHorizontal: S.lg,
    minHeight: 48,
  },
  listRowLabel: { ...F.bd, color: C.label },
  listRowRight: { flexDirection: "row", alignItems: "center", gap: S.xs },
  listRowRightLabel: { ...F.sh, color: C.label2 },
  listRowChevron: { fontSize: 18, color: C.label3, marginLeft: 2 },
  inCardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.sep,
    marginLeft: S.lg,
  },
  sectionHeader: {
    ...F.c2,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: C.label2,
    textTransform: "uppercase",
    marginBottom: S.xs,
    marginTop: S.sm,
    paddingHorizontal: S.xs,
  },

  // Progress dots
  progressDots: {
    flexDirection: "row",
    gap: S.xs,
    alignItems: "center",
  },
  progressDot: {
    height: 4,
    borderRadius: R.full,
  },

  // Onboarding
  onbSkipRow: {
    paddingHorizontal: S.lg,
    alignItems: "flex-end",
  },
  onbContent: {
    flex: 1,
    paddingHorizontal: S.lg,
    paddingTop: S.xxl,
  },
  onbStepNum: {
    ...F.fn,
    color: "rgba(255,255,255,0.30)",
    fontWeight: "700",
    letterSpacing: 1,
  },
  onbTitle: {
    ...F.d2,
    color: C.inkInverse,
    marginTop: S.lg,
    lineHeight: 38,
  },
  onbBody: {
    ...F.cl,
    color: "rgba(255,255,255,0.68)",
    marginTop: S.lg,
    lineHeight: 26,
  },

  // Generating
  genRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: C.ink,
  },
  genOrb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.ink,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.30,
    shadowRadius: 24,
    elevation: 12,
    marginBottom: S.xxl,
  },
  genTitle: {
    ...F.t2,
    color: C.label,
    textAlign: "center",
  },
  genStatus: {
    ...F.sh,
    color: C.label2,
    textAlign: "center",
    marginTop: S.sm,
    paddingHorizontal: S.xxl,
    lineHeight: 22,
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.sep,
    paddingTop: S.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 2,
  },
  tabIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
    letterSpacing: 0.1,
  },

  // City picker modal
  modalRoot: {
    flex: 1,
    backgroundColor: C.bg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.sep,
  },
  modalTitle: { ...F.hl, color: C.label },
  modalSearch: {
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.sep,
  },
  modalSearchInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bgInput,
    borderRadius: R.sm,
    paddingHorizontal: S.md,
    height: 40,
  },
  cityColumns: { flex: 1, flexDirection: "row" },
  provinceList: {
    width: 112,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: C.sep,
    backgroundColor: C.bg,
  },
  provinceItem: {
    paddingVertical: S.md,
    paddingHorizontal: S.md,
  },
  provinceItemActive: {
    backgroundColor: C.bgElevated,
    borderRightWidth: 2.5,
    borderRightColor: C.ink,
  },
  provinceItemLabel: { ...F.fn, color: C.label2, lineHeight: 17 },
  provinceItemLabelActive: { color: C.label, fontWeight: "700" },
  cityList: {
    flex: 1,
    backgroundColor: C.bgElevated,
  },
  cityItem: {
    paddingVertical: S.md + 2,
    paddingHorizontal: S.lg,
  },
  cityItemLabel: { ...F.sh, color: C.label },
  cityItemSub: { ...F.cp, color: C.label2, marginTop: 2 },

  // Premium / Paywall
  premiumHero: {
    paddingHorizontal: S.xxl,
    paddingBottom: S.xxxl,
  },
  premiumCloseRow: {
    alignItems: "flex-end",
    marginBottom: S.xl,
  },
  premiumCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  premiumEyebrow: {
    ...F.fn,
    color: C.gold,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  premiumTitle: { ...F.d1, color: C.inkInverse, marginTop: S.sm, lineHeight: 44 },
  premiumSubtitle: {
    ...F.cl,
    color: "rgba(255,255,255,0.68)",
    marginTop: S.md,
    lineHeight: 24,
  },
  premiumStars: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: S.lg,
    gap: 2,
  },
  premiumFeatureRow: {
    flexDirection: "row",
    gap: S.md,
    alignItems: "flex-start",
  },
  premiumFeatureIcon: {
    width: 34,
    height: 34,
    borderRadius: R.sm,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.sep,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: R.xl,
    borderWidth: 1.5,
    borderColor: C.sepOpaque,
    backgroundColor: C.bgElevated,
    padding: S.lg,
    ...Shadow.sm,
  },
  planCardSelected: {
    borderColor: C.ink,
    backgroundColor: C.bgElevated,
    ...Shadow.md,
  },
  planCardLeft: { flexDirection: "row", gap: S.md, alignItems: "center", flex: 1 },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.sepOpaque,
    alignItems: "center",
    justifyContent: "center",
  },
  planRadioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.ink,
  },
  planBadge: {
    backgroundColor: C.goldBg,
    borderRadius: R.full,
    paddingHorizontal: S.sm,
    paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(198,146,42,0.25)",
  },
  planBadgeLabel: { ...F.c2, color: C.gold, fontWeight: "700" },
});

// ─────────────────────────────────────────────────────────────────────────────
// §19 — DEMO APP WRAPPER  (shows all components for review)
// ─────────────────────────────────────────────────────────────────────────────

export default function UIShowcase() {
  const [screen, setScreen] = useState<
    | "onboarding"
    | "generating"
    | "premium"
    | "tabbar"
  >("onboarding");
  const [activeTab, setActiveTab] = useState<TabKey>("home");

  return (
    <SafeAreaProvider>
      {screen === "onboarding" && (
        <OnboardingScreen onFinish={() => setScreen("generating")} />
      )}
      {screen === "generating" && (
        <GeneratingScreen statusText="正在校正历法、时区与节气边界" />
      )}
      {screen === "premium" && (
        <PremiumScreen onClose={() => setScreen("tabbar")} />
      )}
      {screen === "tabbar" && (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          {/* Placeholder tab content */}
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={[F.t2, { color: C.label2 }]}>
              {activeTab} 页面
            </Text>
            <View style={{ marginTop: S.xxl, gap: S.md, width: 240 }}>
              <PrimaryButton
                label="查看 Paywall"
                onPress={() => setScreen("premium")}
              />
              <SecondaryButton
                label="重新看 Onboarding"
                onPress={() => setScreen("onboarding")}
              />
            </View>
          </View>
          <AppTabBar active={activeTab} onChange={setActiveTab} />
        </View>
      )}
    </SafeAreaProvider>
  );
}
