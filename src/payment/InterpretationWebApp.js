import React, { useMemo, useState } from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { generateInterpretationPreview, getInterpretationFocusOptions } from './interpretationEngineBridge';

const focusOptions = getInterpretationFocusOptions();

export default function InterpretationWebApp() {
  const [birthDate, setBirthDate] = useState('1994-09-17');
  const [birthTime, setBirthTime] = useState('08:30');
  const [city, setCity] = useState('Perth');
  const [focus, setFocus] = useState('career');
  const [submittedAt, setSubmittedAt] = useState(0);

  const result = useMemo(() => {
    return generateInterpretationPreview({
      birthDate,
      birthTime,
      city,
      focus,
    });
  }, [birthDate, birthTime, city, focus, submittedAt]);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.shell}>
        <View style={styles.headerBand}>
          <ImageBackground
            source={require('../../assets/splash.png')}
            resizeMode="cover"
            imageStyle={styles.headerImage}
            style={styles.headerImageWrap}
          >
            <View style={styles.headerOverlay}>
              <Text style={styles.headerEyebrow}>MingSky Astrology | 明空星占</Text>
              <Text style={styles.headerTitle}>输入你的出生信息，先看最亮的主题。</Text>
              <Text style={styles.headerBody}>
                先跑一版事业、关系、自我或财富主线，再决定下一步要继续深挖哪一块。
              </Text>
            </View>
          </ImageBackground>
        </View>

        <View style={styles.toolBand}>
          <View style={styles.formColumn}>
            <Text style={styles.sectionTitle}>出生信息</Text>
            <Text style={styles.fieldLabel}>出生日期</Text>
            <TextInput value={birthDate} onChangeText={setBirthDate} style={styles.input} placeholder="YYYY-MM-DD" />

            <Text style={styles.fieldLabel}>出生时间</Text>
            <TextInput value={birthTime} onChangeText={setBirthTime} style={styles.input} placeholder="HH:MM" />

            <Text style={styles.fieldLabel}>出生城市</Text>
            <TextInput value={city} onChangeText={setCity} style={styles.input} placeholder="City" />

            <Text style={styles.fieldLabel}>先看哪条主线</Text>
            <View style={styles.chipRow}>
              {focusOptions.map((option) => {
                const active = option.key === focus;
                return (
                  <Pressable key={option.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setFocus(option.key)}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.primaryButton} onPress={() => setSubmittedAt(Date.now())}>
              <Text style={styles.primaryButtonText}>生成解读</Text>
            </Pressable>
          </View>

          <View style={styles.resultColumn}>
            <View style={styles.resultHero}>
              <View style={styles.resultHeroCopy}>
                <Text style={styles.resultHeroTitle}>{result.headline}</Text>
                <Text style={styles.resultHeroBody}>{result.summary}</Text>
              </View>
              <Image source={require('../../assets/icon.png')} style={styles.sideImage} />
            </View>

            <View style={styles.metricRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{result.insights.length}</Text>
                <Text style={styles.metricLabel}>核心结论</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{result.tags.length}</Text>
                <Text style={styles.metricLabel}>结构化主题</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{result.crossSystemCount}</Text>
                <Text style={styles.metricLabel}>跨体系共振</Text>
              </View>
            </View>

            <View style={styles.sectionBand}>
              <Text style={styles.sectionTitle}>本次先看这三条</Text>
              {result.insights.map((insight) => (
                <View key={insight.code} style={styles.listItem}>
                  <Text style={styles.listTitle}>{insight.title}</Text>
                  <Text style={styles.listBody}>{insight.body}</Text>
                </View>
              ))}
            </View>

            <View style={styles.sectionBand}>
              <Text style={styles.sectionTitle}>结构化主题</Text>
              <View style={styles.tagWrap}>
                {result.tags.map((tag) => (
                  <View key={tag.code} style={styles.tagPill}>
                    <Text style={styles.tagText}>{tag.label}</Text>
                    {tag.crossSystem ? <Text style={styles.tagMeta}>双系统</Text> : null}
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.sectionBand}>
              <Text style={styles.sectionTitle}>证据链</Text>
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
    backgroundColor: '#f5efe7',
  },
  content: {
    paddingBottom: 40,
  },
  shell: {
    width: '100%',
  },
  headerBand: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  headerImageWrap: {
    minHeight: 280,
    justifyContent: 'flex-end',
  },
  headerImage: {
    borderRadius: 8,
  },
  headerOverlay: {
    paddingHorizontal: 28,
    paddingVertical: 28,
    backgroundColor: 'rgba(17, 12, 8, 0.48)',
    borderRadius: 8,
  },
  headerEyebrow: {
    color: '#f7e5b7',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  headerTitle: {
    color: '#fff7ea',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    maxWidth: 680,
  },
  headerBody: {
    marginTop: 12,
    color: 'rgba(255,247,234,0.88)',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 620,
  },
  toolBand: {
    flexDirection: 'row',
    gap: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: 'flex-start',
  },
  formColumn: {
    flex: 0.95,
    minWidth: 320,
    backgroundColor: '#fffaf2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 39, 28, 0.12)',
    padding: 20,
  },
  resultColumn: {
    flex: 1.25,
    minWidth: 360,
    gap: 18,
  },
  sectionTitle: {
    color: '#2b2118',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    marginBottom: 14,
  },
  fieldLabel: {
    color: '#5f5043',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 6,
  },
  input: {
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 39, 28, 0.15)',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    color: '#241a12',
    fontSize: 15,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 39, 28, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: '#2d1d14',
    borderColor: '#2d1d14',
  },
  chipText: {
    color: '#423428',
    fontSize: 14,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#fff5ea',
  },
  primaryButton: {
    marginTop: 10,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#ca7a35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff8ee',
    fontSize: 15,
    fontWeight: '800',
  },
  resultHero: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 39, 28, 0.12)',
    backgroundColor: '#fffaf3',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  resultHeroCopy: {
    flex: 1,
  },
  resultHeroTitle: {
    color: '#241a12',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  resultHeroBody: {
    marginTop: 10,
    color: '#5f5043',
    fontSize: 16,
    lineHeight: 24,
  },
  sideImage: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 14,
  },
  metricItem: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(52, 39, 28, 0.1)',
    padding: 16,
  },
  metricValue: {
    color: '#2d1d14',
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
  },
  metricLabel: {
    marginTop: 8,
    color: '#6b5a4b',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  sectionBand: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 39, 28, 0.1)',
    backgroundColor: '#fff',
    padding: 20,
  },
  listItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(52, 39, 28, 0.08)',
  },
  listTitle: {
    color: '#241a12',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  listBody: {
    marginTop: 8,
    color: '#5f5043',
    fontSize: 15,
    lineHeight: 23,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagPill: {
    borderRadius: 8,
    backgroundColor: '#f7efe3',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(52, 39, 28, 0.08)',
  },
  tagText: {
    color: '#2b2118',
    fontSize: 14,
    fontWeight: '700',
  },
  tagMeta: {
    marginTop: 4,
    color: '#9c6b3f',
    fontSize: 12,
    fontWeight: '700',
  },
  evidenceRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(52, 39, 28, 0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  evidenceLabel: {
    flex: 1,
    color: '#2b2118',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  evidenceMeta: {
    color: '#8a725f',
    fontSize: 12,
    lineHeight: 18,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
});
