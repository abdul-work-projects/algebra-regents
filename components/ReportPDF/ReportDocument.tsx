'use client';

import { Document, Page, Text, View, StyleSheet, Circle, Svg } from '@react-pdf/renderer';
import { QuizResult, Test } from '@/lib/types';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#111827',
  },
  date: {
    fontSize: 10,
    color: '#6b7280',
  },
  scoreSection: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'center',
    gap: 24,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreDetails: {
    flex: 1,
  },
  mainScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  stat: {
    fontSize: 10,
    color: '#374151',
  },
  statValue: {
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    marginTop: 16,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  topicName: {
    fontSize: 10,
    color: '#374151',
    width: '40%',
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  topicPercent: {
    fontSize: 10,
    color: '#6b7280',
    width: 50,
    textAlign: 'right',
  },
  reviewSection: {
    marginTop: 8,
  },
  reviewItem: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 4,
    marginBottom: 4,
  },
  reviewNumber: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#991b1b',
    width: 50,
  },
  reviewAnswers: {
    fontSize: 10,
    color: '#374151',
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
  },
  passCircle: {
    backgroundColor: '#22c55e',
  },
  failCircle: {
    backgroundColor: '#ef4444',
  },
  circleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

interface ReportDocumentProps {
  result: QuizResult;
  test?: Test | null;
  scaledScore: number;
}

export default function ReportDocument({ result, test, scaledScore }: ReportDocumentProps) {
  const isPassing = scaledScore >= 65;
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Get missed questions
  const missedQuestions = result.questionResults
    .map((qr, index) => ({ ...qr, questionNumber: index + 1 }))
    .filter((qr) => !qr.isCorrect);

  // Get topics sorted by percentage
  const sortedTopics = Object.entries(result.topicAccuracy)
    .sort((a, b) => b[1].percentage - a[1].percentage);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return '#22c55e';
    if (percentage >= 65) return '#3b82f6';
    if (percentage >= 50) return '#eab308';
    return '#ef4444';
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {test ? test.name : 'Algebra I Regents Practice Test'}
          </Text>
          <Text style={styles.date}>{currentDate}</Text>
        </View>

        {/* Score Section */}
        <View style={styles.scoreSection}>
          {/* Pass/Fail Circle */}
          <View style={styles.scoreCircle}>
            <Svg width={100} height={100} viewBox="0 0 100 100">
              <Circle
                cx={50}
                cy={50}
                r={45}
                fill={isPassing ? '#22c55e' : '#ef4444'}
              />
              <Text
                x={50}
                y={55}
                textAnchor="middle"
                style={{ fontSize: 16, fontWeight: 'bold', fill: '#ffffff' }}
              >
                {isPassing ? 'PASS' : 'FAIL'}
              </Text>
            </Svg>
          </View>

          {/* Score Details */}
          <View style={styles.scoreDetails}>
            <Text style={styles.mainScore}>{scaledScore}/100</Text>
            <Text style={styles.scoreLabel}>Scaled Score</Text>

            <View style={styles.statRow}>
              <Text style={styles.stat}>
                Raw: <Text style={styles.statValue}>{result.earnedPoints}/{result.totalPoints}</Text>
              </Text>
              <Text style={styles.stat}>
                Questions: <Text style={styles.statValue}>{result.score}/{result.totalQuestions}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Performance by Topic */}
        <Text style={styles.sectionTitle}>PERFORMANCE BY TOPIC</Text>
        {sortedTopics.map(([topic, stats]) => (
          <View key={topic} style={styles.topicRow}>
            <Text style={styles.topicName}>{topic}</Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${stats.percentage}%`,
                    backgroundColor: getProgressColor(stats.percentage),
                  },
                ]}
              />
            </View>
            <Text style={styles.topicPercent}>
              {stats.correct}/{stats.total} ({stats.percentage}%)
            </Text>
          </View>
        ))}

        {/* Questions to Review */}
        {missedQuestions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>QUESTIONS TO REVIEW ({missedQuestions.length})</Text>
            <View style={styles.reviewSection}>
              {missedQuestions.slice(0, 15).map((q) => (
                <View key={q.questionId} style={styles.reviewItem}>
                  <Text style={styles.reviewNumber}>Q{q.questionNumber}</Text>
                  <Text style={styles.reviewAnswers}>
                    {q.userAnswer !== null
                      ? `Your answer: (${q.userAnswer}) | Correct: (${q.correctAnswer})`
                      : `Not answered | Correct: (${q.correctAnswer})`}
                  </Text>
                </View>
              ))}
              {missedQuestions.length > 15 && (
                <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 4 }}>
                  + {missedQuestions.length - 15} more questions to review
                </Text>
              )}
            </View>
          </>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by Algebra I Regents Practice App
        </Text>
      </Page>
    </Document>
  );
}
