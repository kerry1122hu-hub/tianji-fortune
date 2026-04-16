import React, { useMemo, useState } from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { generateInterpretationPreview, getInterpretationFocusOptions } from './interpretationEngineBridge';

const focusOptions = getInterpretationFocusOptions();

const reportCatalog = [
  {
    key: 'past-life',
    title: '前世报告',
    subtitle: '探索前世，发现人生意义',
    accent: '热门',
    featured: true,
  },
  {
    key: 'personality',
    title: '性格报告',
    subtitle: '发现你个性的核心',
  },
  {
    key: 'relationship',
    title: '关系报告',
    subtitle: '深入了解你的人际关系特征',
  },
  {
    key: 'monthly',
    title: '月度预测报告',
    subtitle: '利用个性化指导规划你的月度节奏',
  },
  {
    key: 'compatibility',
    title: '兼容性报告',
    subtitle: '揭开你人际关系中的动态',
  },
  {
    key: 'wealth',
    title: '财务潜力报告',
    subtitle: '了解你的财务优势和机会',
  },
  {
    key: 'evolution',
    title: '生命进化报告',
    subtitle: '看清你正在经历的成长课题',
  },
];

function ReportCard({ report }) {
  return (
    <View style={[styles.reportCard, report.featured && styles.reportCardFeatured]}>
      <View style={styles.reportHeader}>
        <Text style={[styles.reportTitle, report.featured && styles.reportTitleFeatured]}>{report.title}</Text>
        {report.accent ? <Text style={styles.reportAccent}>{report.accent}</Text> : null}
      </View>
      <Text style={[styles.reportSubtitle, report.featured && styles.reportSubtitleFeatured]}>{report.subtitle}</Text>
    </View>
  );
}

function MetricCard({ value, label }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export default function InterpretationWebApp() {
  const [birthDate, setBirthDate] = useState('1994-09-17');
  const [birthTime, setBirthTime] = useState('08:30');
  const [city, setCity] = useState('Perth');
  const [focus, setFocus] = useState('career');
  const [submittedAt, setSubmittedAt] = useState(0);
  const { width } = useWindowDimensions();
  const isNarrow = width < 980;

  const result = useMemo(
    () =>
      generateInterpretationPreview({
        birthDate,
        birthTime,
        city,
        focus,
      }),
    [birthDate, birthTime, city, focus, submittedAt],
  );

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.shell}>
        <View style={styles.heroBand}>
          <ImageBackground
            source={require('../../assets/splash.png')}
            resizeMode="cover"
            imageStyle={styles.heroImage}
            style={styles.heroImageWrap}
          >
            <View style={styles.heroOverlay}>
              <Text style={styles.heroEyebrow}>MingSky Astrology | 明空星占</Text>
              <Text style={styles.heroTitle}>先挑你最想看的报告，再输入出生信息。</Text>
              <Text style={styles.heroBody}>
                把首页直接做成可用的报告入口。前世、性格、关系、财富、兼容性与生命进化，都先摆在最前面。
              </Text>
            </View>
          </ImageBackground>
        </View>

        <View style={styles.sectionBand}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>Reports</Text>
            <Text style={styles.sectionTitle}>先把最能吸引用户点开的星盘报告摆出来</Text>
          </View>
          <View style={styles.reportGrid}>
            {reportCatalog.map((report) => (
              <ReportCard key={report.key} report={report} />
            ))}
          </View>
        </View>

        <View style={[styles.workspaceBand, isNarrow && styles.workspaceBandStacked]}>
          <View style={styles.formPanel}>
            <Text style={styles.panelTitle}>输入出生信息</Text>
            <Text style={styles.panelSubtitle}>先跑一版你最关心的主线，再决定下一步深入哪份报告。</Text>

            <Text style={styles.fieldLabel}>出生日期</Text>
            <TextInput value={birthDate} onChangeText={setBirthDate} style={styles.input} placeholder="YYYY-MM-DD" />

            <Text style={styles.fieldLabel}>出生时间</Text>
            <TextInput value={birthTime} onChangeText={setBirthTime} style={styles.input} placeholder="HH:MM" />

            <Text style={styles.fieldLabel}>出生城市</Text>
            <TextInput value={city} onChangeText={setCity} style={styles.input} placeholder="City" />

            <Text style={styles.fieldLabel}>先看哪条主线</Text>
            <View style={styles.focusWrap}>
              {focusOptions.map((option) => {
                const active = option.key === focus;
                return (
                  <Pressable key={option.key} style={[styles.focusChip, active && styles.focusChipActive]} onPress={() => setFocus(option.key)}>
                    <Text style={[styles.focusChipText, active && styles.focusChipTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.primaryButton} onPress={() => setSubmittedAt(Date.now())}>
              <Text style={styles.primaryButtonText}>生成解读</Text>
            </Pressable>
          </View>

          <View style={styles.previewPanel}>
            <View style={styles.previewHero}>
              <Text style={styles.previewHeroTitle}>{result.headline}</Text>
              <Text style={styles.previewHeroBody}>{result.summary}</Text>
            </View>

            <View style={styles.metricRow}>
              <MetricCard value={result.insights.length} label="核心结论" />
              <MetricCard value={result.tags.length} label="结构化主题" />
              <MetricCard value={result.crossSystemCount} label="跨体系共振" />
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.previewSectionTitle}>本次先看这三条</Text>
              {result.insights.map((insight) => (
                <View key={insight.code} style={styles.listRow}>
                  <Text style={styles.listTitle}>{insight.title}</Text>
                  <Text style={styles.listBody}>{insight.body}</Text>
                </View>
              ))}
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.previewSectionTitle}>结构化主题</Text>
              <View style={styles.tagWrap}>
                {result.tags.map((tag) => (
                  <View key={tag.code} style={styles.tagPill}>
                    <Text style={styles.tagText}>{tag.label}</Text>
                    {tag.crossSystem ? <Text style={styles.tagMeta}>双系统共振</Text> : null}
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.previewSectionTitle}>证据链</Text>
              {result.evidence.map((item) => (
                <View key={item.code} style={styles.evidenceRow}>
                  <Text style={styles.evidenceLabel}>{item.label}</Text>
                  <Text style={styles.evidenceMeta}>{item.system}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#edf2ee',
  },
  content: {
    paddingBottom: 36,
  },
  shell: {
    width: '100%',
  },
  heroBand: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  heroImageWrap: {
    minHeight: 280,
    justifyContent: 'flex-end',
  },
  heroImage: {
    borderRadius: 8,
  },
  heroOverlay: {
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 28,
    backgroundColor: 'rgba(10, 20, 22, 0.56)',
  },
  heroEyebrow: {
    color: '#e7c36c',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  heroTitle: {
    marginTop: 10,
    color: '#f7faf8',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    maxWidth: 760,
  },
  heroBody: {
    marginTop: 12,
    color: 'rgba(247,250,248,0.88)',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 720,
  },
  sectionBand: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionEyebrow: {
    color: '#516b62',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    marginTop: 6,
    color: '#17221d',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    maxWidth: 760,
  },
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  reportCard: {
    minWidth: 220,
    flexGrow: 1,
    flexBasis: 220,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.1)',
    backgroundColor: '#f8fbf9',
    padding: 18,
  },
  reportCardFeatured: {
    backgroundColor: '#112722',
    borderColor: '#112722',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  reportTitle: {
    color: '#17221d',
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
  },
  reportTitleFeatured: {
    color: '#f7faf8',
  },
  reportAccent: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#d69a3b',
    color: '#fffaf1',
    fontSize: 11,
    fontWeight: '800',
  },
  reportSubtitle: {
    marginTop: 14,
    color: '#51615a',
    fontSize: 14,
    lineHeight: 20,
  },
  reportSubtitleFeatured: {
    color: 'rgba(247,250,248,0.84)',
  },
  workspaceBand: {
    flexDirection: 'row',
    gap: 22,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  workspaceBandStacked: {
    flexDirection: 'column',
  },
  formPanel: {
    flex: 0.92,
    minWidth: 320,
    borderRadius: 8,
    backgroundColor: '#fbfdfc',
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.1)',
  },
  previewPanel: {
    flex: 1.18,
    minWidth: 320,
    gap: 16,
  },
  panelTitle: {
    color: '#17221d',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  panelSubtitle: {
    marginTop: 8,
    color: '#5a6b64',
    fontSize: 15,
    lineHeight: 22,
  },
  fieldLabel: {
    marginTop: 18,
    color: '#2a3732',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  input: {
    marginTop: 8,
    height: 54,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.14)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    color: '#17221d',
    fontSize: 16,
  },
  focusWrap: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  focusChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.14)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  focusChipActive: {
    backgroundColor: '#17362f',
    borderColor: '#17362f',
  },
  focusChipText: {
    color: '#264038',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  focusChipTextActive: {
    color: '#f5faf7',
  },
  primaryButton: {
    marginTop: 22,
    height: 54,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c9893f',
  },
  primaryButtonText: {
    color: '#fffaf3',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  previewHero: {
    borderRadius: 8,
    backgroundColor: '#fbfdfc',
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.1)',
    padding: 18,
  },
  previewHeroTitle: {
    color: '#17221d',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
  },
  previewHeroBody: {
    marginTop: 10,
    color: '#5a6b64',
    fontSize: 15,
    lineHeight: 22,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: 150,
    borderRadius: 8,
    backgroundColor: '#fbfdfc',
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.1)',
    padding: 16,
  },
  metricValue: {
    color: '#17221d',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
  },
  metricLabel: {
    marginTop: 8,
    color: '#5a6b64',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  previewSection: {
    borderRadius: 8,
    backgroundColor: '#fbfdfc',
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.1)',
    padding: 18,
  },
  previewSectionTitle: {
    color: '#17221d',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  listRow: {
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(23,34,29,0.08)',
  },
  listTitle: {
    color: '#17221d',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  listBody: {
    marginTop: 8,
    color: '#5a6b64',
    fontSize: 15,
    lineHeight: 22,
  },
  tagWrap: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagPill: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#eef3ef',
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.08)',
  },
  tagText: {
    color: '#20312a',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  tagMeta: {
    marginTop: 4,
    color: '#678377',
    fontSize: 12,
    lineHeight: 16,
  },
  evidenceRow: {
    paddingTop: 14,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(23,34,29,0.08)',
  },
  evidenceLabel: {
    flex: 1,
    color: '#17221d',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  evidenceMeta: {
    color: '#678377',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
