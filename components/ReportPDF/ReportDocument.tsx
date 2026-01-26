'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { QuizResult, Test, Question } from '@/lib/types';

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    fontSize: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
  },
  date: {
    fontSize: 7,
    color: '#6b7280',
  },
  topSection: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 12,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  circleContainer: {
    width: 50,
    height: 50,
  },
  scoreDetails: {
    flex: 1,
  },
  mainScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  scoreOf100: {
    fontSize: 10,
    color: '#9ca3af',
  },
  scoreLine: {
    fontSize: 7,
    color: '#6b7280',
    marginTop: 1,
  },
  scoreValue: {
    fontWeight: 'bold',
    color: '#111827',
  },
  messageBox: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginTop: 4,
  },
  messageText: {
    fontSize: 6,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 5,
    color: '#6b7280',
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  topicName: {
    fontSize: 6,
    color: '#374151',
    width: '45%',
  },
  topicBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginHorizontal: 4,
  },
  topicFill: {
    height: 4,
    borderRadius: 2,
  },
  topicPct: {
    fontSize: 6,
    color: '#6b7280',
    width: 20,
    textAlign: 'right',
  },
  questionsSection: {
    marginTop: 6,
  },
  questionsSectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
    backgroundColor: '#f9fafb',
    padding: 3,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  questionColumn: {
    flex: 1,
  },
  questionRow: {
    flexDirection: 'row',
    paddingVertical: 1.5,
    paddingHorizontal: 2,
    marginBottom: 1,
    borderRadius: 2,
  },
  correctRow: {
    backgroundColor: '#f0fdf4',
  },
  incorrectRow: {
    backgroundColor: '#fef2f2',
  },
  qNum: {
    fontSize: 6,
    fontWeight: 'bold',
    width: 18,
    color: '#374151',
  },
  qText: {
    fontSize: 5,
    color: '#6b7280',
    flex: 1,
    marginRight: 4,
  },
  qYour: {
    fontSize: 6,
    fontWeight: 'bold',
    width: 16,
    textAlign: 'center',
  },
  qCorrect: {
    fontSize: 6,
    color: '#991b1b',
    width: 16,
    textAlign: 'center',
  },
  qResult: {
    fontSize: 7,
    fontWeight: 'bold',
    width: 10,
    textAlign: 'center',
  },
  correctText: {
    color: '#166534',
  },
  incorrectText: {
    color: '#991b1b',
  },
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 6,
    color: '#9ca3af',
  },
});

interface ReportDocumentProps {
  result: QuizResult;
  test?: Test | null;
  scaledScore: number;
  questions: Question[];
}

// Format time for PDF (same as results page)
const formatTimeForPdf = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};

export default function ReportDocument({ result, test, scaledScore, questions }: ReportDocumentProps) {
  const isPassing = scaledScore >= 65;
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const sortedTopics = Object.entries(result.topicAccuracy)
    .sort((a, b) => b[1].percentage - a[1].percentage);

  const getColor = (pct: number) => {
    if (pct >= 80) return '#22c55e';
    if (pct >= 65) return '#3b82f6';
    if (pct >= 50) return '#eab308';
    return '#ef4444';
  };

  const getMessage = () => {
    if (scaledScore >= 85) return { text: 'Excellent Work!', bg: '#dcfce7', color: '#166534' };
    if (scaledScore >= 65) return { text: 'You Passed!', bg: '#dbeafe', color: '#1e40af' };
    if (scaledScore >= 50) return { text: 'Almost There!', bg: '#fef3c7', color: '#92400e' };
    return { text: 'Keep Practicing', bg: '#fee2e2', color: '#991b1b' };
  };
  const message = getMessage();

  const allQuestions = result.questionResults.map((qr, i) => {
    const question = questions.find(q => q.id === qr.questionId);
    return {
      ...qr,
      num: i + 1,
      skill: question?.topics?.join(', ') || '',
    };
  });

  // Calculate how many questions fit per page
  // First page has header + score section, so fewer questions
  const questionsPerFirstPage = 38; // ~19 per column
  const questionsPerPage = 56; // ~28 per column

  const firstPageQuestions = allQuestions.slice(0, questionsPerFirstPage);
  const remainingQuestions = allQuestions.slice(questionsPerFirstPage);
  const additionalPages: typeof allQuestions[] = [];

  for (let i = 0; i < remainingQuestions.length; i += questionsPerPage) {
    additionalPages.push(remainingQuestions.slice(i, i + questionsPerPage));
  }

  // Split questions into two columns
  const splitIntoColumns = (questions: typeof allQuestions) => {
    const mid = Math.ceil(questions.length / 2);
    return [questions.slice(0, mid), questions.slice(mid)];
  };

  const QuestionRow = ({ q }: { q: typeof allQuestions[0] }) => (
    <View style={[styles.questionRow, q.isCorrect ? styles.correctRow : styles.incorrectRow]}>
      <Text style={styles.qNum}>Q{q.num}</Text>
      <Text style={styles.qText}>{q.skill}</Text>
      <Text style={[styles.qYour, q.isCorrect ? styles.correctText : styles.incorrectText]}>
        ({q.userAnswer !== null ? q.userAnswer : '-'})
      </Text>
      <Text style={styles.qCorrect}>
        {q.isCorrect ? '' : `(${q.correctAnswer})`}
      </Text>
      <Text style={[styles.qResult, q.isCorrect ? styles.correctText : styles.incorrectText]}>
        {q.isCorrect ? '✓' : '✗'}
      </Text>
    </View>
  );

  const TableHeader = () => (
    <View style={{
      flexDirection: 'row',
      paddingVertical: 2,
      paddingHorizontal: 2,
      backgroundColor: '#f3f4f6',
      marginBottom: 2,
      borderRadius: 2,
    }}>
      <Text style={{ fontSize: 5, fontWeight: 'bold', color: '#6b7280', width: 18 }}>#</Text>
      <Text style={{ fontSize: 5, fontWeight: 'bold', color: '#6b7280', flex: 1, marginRight: 4 }}>Skill</Text>
      <Text style={{ fontSize: 5, fontWeight: 'bold', color: '#6b7280', width: 16, textAlign: 'center' }}>You</Text>
      <Text style={{ fontSize: 5, fontWeight: 'bold', color: '#6b7280', width: 16, textAlign: 'center' }}>Ans</Text>
      <Text style={{ fontSize: 5, fontWeight: 'bold', color: '#6b7280', width: 10, textAlign: 'center' }}></Text>
    </View>
  );

  const TwoColumnQuestions = ({ questions, showHeader = true }: { questions: typeof allQuestions; showHeader?: boolean }) => {
    const [col1, col2] = splitIntoColumns(questions);
    return (
      <View style={styles.twoColumnGrid}>
        <View style={styles.questionColumn}>
          {showHeader && <TableHeader />}
          {col1.map((q) => <QuestionRow key={q.questionId} q={q} />)}
        </View>
        <View style={styles.questionColumn}>
          {showHeader && <TableHeader />}
          {col2.map((q) => <QuestionRow key={q.questionId} q={q} />)}
        </View>
      </View>
    );
  };

  const totalPages = additionalPages.length + 1;

  return (
    <Document>
      {/* First Page */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{test?.name || 'Algebra I Regents'}</Text>
          <Text style={styles.date}>{currentDate}</Text>
        </View>

        {/* Top Section: Score Left, Topics Right */}
        <View style={styles.topSection}>
          {/* Left: Score Card */}
          <View style={styles.leftColumn}>
            <View style={styles.scoreCard}>
              {/* Pass/Fail Circle */}
              <View style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: isPassing ? '#22c55e' : '#ef4444',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{
                  fontSize: 8,
                  fontWeight: 'bold',
                  color: '#ffffff',
                }}>
                  {isPassing ? 'PASS' : 'FAIL'}
                </Text>
              </View>

              {/* Score Details - Match results page exactly */}
              <View style={styles.scoreDetails}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2 }}>
                  <Text style={styles.mainScore}>{scaledScore}</Text>
                  <Text style={[styles.scoreOf100, { marginBottom: 2 }]}>/100</Text>
                </View>
                <Text style={styles.scoreLine}>
                  Scaled score: <Text style={styles.scoreValue}>{scaledScore}</Text>
                </Text>
                <Text style={styles.scoreLine}>
                  Raw score: <Text style={styles.scoreValue}>{result.earnedPoints}</Text> / {result.totalPoints}
                </Text>
                <Text style={[styles.scoreLine, { color: '#9ca3af', marginBottom: 4 }]}>
                  {result.score} / {result.totalQuestions} questions correct
                </Text>
                {/* Message - inline */}
                <View style={[styles.messageBox, { backgroundColor: message.bg, alignSelf: 'flex-start' }]}>
                  <Text style={[styles.messageText, { color: message.color }]}>{message.text}</Text>
                </View>
              </View>
            </View>

            {/* Stats Row - Match results page */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatTimeForPdf(result.averageTime)}</Text>
                <Text style={styles.statLabel}>Avg. Time</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{Object.keys(result.topicAccuracy).length}</Text>
                <Text style={styles.statLabel}>Topics</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#f59e0b' }]}>{result.missedOnFirstAttemptCount}</Text>
                <Text style={styles.statLabel}>Missed 1st Try</Text>
              </View>
            </View>
          </View>

          {/* Right: Topics */}
          <View style={styles.rightColumn}>
            <Text style={styles.sectionTitle}>PERFORMANCE BY TOPIC</Text>
            {sortedTopics.map(([topic, stats]) => (
              <View key={topic} style={styles.topicRow}>
                <Text style={styles.topicName}>{topic}</Text>
                <View style={styles.topicBar}>
                  <View style={[styles.topicFill, { width: `${stats.percentage}%`, backgroundColor: getColor(stats.percentage) }]} />
                </View>
                <Text style={styles.topicPct}>{stats.percentage}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Questions Section */}
        <View style={styles.questionsSection}>
          <Text style={styles.questionsSectionTitle}>QUESTION BREAKDOWN</Text>
          <TwoColumnQuestions questions={firstPageQuestions} />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Algebra I Regents Practice</Text>
          <Text>Page 1{totalPages > 1 ? ` of ${totalPages}` : ''}</Text>
        </View>
      </Page>

      {/* Additional Pages */}
      {additionalPages.map((pageQuestions, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>{test?.name || 'Algebra I Regents'} - Questions</Text>
            <Text style={styles.date}>{currentDate}</Text>
          </View>

          <TwoColumnQuestions questions={pageQuestions} />

          <View style={styles.footer}>
            <Text>Algebra I Regents Practice</Text>
            <Text>Page {pageIndex + 2} of {totalPages}</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
