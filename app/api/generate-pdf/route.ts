import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { result, test, scaledScore, questions } = data;

    // Generate HTML content with KaTeX
    const html = generateReportHTML(result, test, scaledScore, questions);

    // Launch puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="quiz-report.pdf"',
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

function generateReportHTML(result: any, test: any, scaledScore: number, questions: any[]) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const getStatus = (score: number) => {
    if (score >= 85) return { status: 'Passed', color: '#22c55e', bg: '#dcfce7' };
    if (score >= 65) return { status: 'Passed', color: '#3b82f6', bg: '#dbeafe' };
    if (score >= 56) return { status: 'Failed', color: '#f97316', bg: '#fff7ed' };
    return { status: 'Failed', color: '#ef4444', bg: '#fee2e2' };
  };

  const getMessage = (score: number) => {
    if (score >= 85) return { text: 'Outstanding performance! You have mastered the material.', bg: '#dcfce7', color: '#166534' };
    if (score >= 65) return { text: 'Great job! You have demonstrated solid understanding.', bg: '#dbeafe', color: '#1e40af' };
    if (score >= 56) return { text: "You're almost there! Review the material and try again.", bg: '#fff7ed', color: '#c2410c' };
    return { text: 'Keep practicing! Review the material and try again.', bg: '#fee2e2', color: '#991b1b' };
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const getTopicColor = (pct: number) => {
    if (pct >= 80) return '#22c55e';
    if (pct >= 65) return '#3b82f6';
    if (pct >= 50) return '#eab308';
    return '#ef4444';
  };

  const statusInfo = getStatus(scaledScore);
  const message = getMessage(scaledScore);

  const sortedTopics = Object.entries(result.topicAccuracy)
    .sort((a: any, b: any) => b[1].percentage - a[1].percentage);

  const questionResults = result.questionResults.map((qr: any, i: number) => {
    const question = questions.find((q: any) => q.id === qr.questionId);
    const userAnswerIndex = qr.userAnswer ? qr.userAnswer - 1 : -1;
    const correctAnswerIndex = qr.correctAnswer - 1;
    return {
      ...qr,
      num: i + 1,
      questionText: question?.questionText || '',
      skills: question?.topics?.join(', ') || '',
      userAnswerText: userAnswerIndex >= 0 && question?.answers ? question.answers[userAnswerIndex] : '-',
      correctAnswerText: question?.answers ? question.answers[correctAnswerIndex] : '',
    };
  });

  // Split questions into two columns
  const mid = Math.ceil(questionResults.length / 2);
  const col1 = questionResults.slice(0, mid);
  const col2 = questionResults.slice(mid);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 9px;
      color: #374151;
      padding: 0;
    }
    .page { padding: 10px; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 12px;
    }
    .title { font-size: 14px; font-weight: bold; color: #111827; }
    .date { font-size: 8px; color: #6b7280; }

    .top-section {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
    }
    .left-column, .right-column { flex: 1; }

    .score-card {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }
    .score-circle {
      width: 55px;
      height: 55px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 9px;
    }
    .score-details { flex: 1; }
    .main-score {
      font-size: 22px;
      font-weight: bold;
      color: #111827;
    }
    .score-of-100 {
      font-size: 12px;
      color: #9ca3af;
      margin-left: 2px;
    }
    .score-line {
      font-size: 8px;
      color: #6b7280;
      margin-top: 2px;
    }
    .score-value { font-weight: bold; color: #111827; }
    .message-box {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 7px;
      font-weight: bold;
      margin-top: 4px;
    }

    .stats-row {
      display: flex;
      justify-content: space-between;
      padding-top: 8px;
      border-top: 1px solid #f3f4f6;
    }
    .stat-item { text-align: center; }
    .stat-value { font-size: 12px; font-weight: bold; color: #111827; }
    .stat-label { font-size: 6px; color: #6b7280; margin-top: 2px; }

    .section-title {
      font-size: 9px;
      font-weight: bold;
      color: #111827;
      margin-bottom: 6px;
    }
    .topic-row {
      display: flex;
      align-items: center;
      margin-bottom: 4px;
    }
    .topic-name {
      font-size: 7px;
      color: #374151;
      width: 45%;
    }
    .topic-bar {
      flex: 1;
      height: 5px;
      background: #e5e7eb;
      border-radius: 3px;
      margin: 0 6px;
      overflow: hidden;
    }
    .topic-fill { height: 100%; border-radius: 3px; }
    .topic-pct {
      font-size: 7px;
      color: #6b7280;
      width: 25px;
      text-align: right;
    }

    .questions-section { margin-top: 10px; }
    .questions-title {
      font-size: 9px;
      font-weight: bold;
      color: #111827;
      background: #f9fafb;
      padding: 4px 6px;
      margin-bottom: 6px;
    }
    .two-columns {
      display: flex;
      gap: 12px;
    }
    .question-column { flex: 1; }
    .question-row {
      padding: 6px 8px;
      border-radius: 4px;
      margin-bottom: 6px;
      border: 1px solid #e5e7eb;
    }
    .correct-row { background: #f0fdf4; border-color: #bbf7d0; }
    .incorrect-row { background: #fef2f2; border-color: #fecaca; }
    .q-header {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin-bottom: 4px;
    }
    .q-num {
      font-size: 8px;
      font-weight: bold;
      color: #374151;
      background: #e5e7eb;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .q-result {
      font-size: 10px;
      font-weight: bold;
      margin-left: auto;
    }
    .q-text {
      font-size: 7px;
      color: #374151;
      line-height: 1.4;
      margin-bottom: 4px;
    }
    .q-text .katex { font-size: 8px; }
    .q-skills {
      font-size: 6px;
      color: #6b7280;
      margin-bottom: 6px;
      padding: 2px 6px;
      background: #f3f4f6;
      border-radius: 3px;
      display: inline-block;
    }
    .q-answers {
      display: flex;
      gap: 8px;
      font-size: 6px;
      padding-top: 4px;
      border-top: 1px solid #e5e7eb;
    }
    .q-answer-item {
      flex: 1;
    }
    .q-answer-label {
      font-weight: bold;
      color: #6b7280;
      margin-bottom: 2px;
    }
    .q-answer-text {
      color: #374151;
      line-height: 1.3;
    }
    .q-answer-text .katex { font-size: 7px; }
    .correct-text { color: #166534; }
    .incorrect-text { color: #991b1b; }

    .footer {
      position: fixed;
      bottom: 10px;
      left: 20px;
      right: 20px;
      display: flex;
      justify-content: space-between;
      font-size: 7px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="title">${test?.name || 'Algebra I Regents'}</div>
      <div class="date">${currentDate}</div>
    </div>

    <div class="top-section">
      <div class="left-column">
        <div class="score-card">
          <div class="score-circle" style="background: ${statusInfo.color}">
            ${statusInfo.status}
          </div>
          <div class="score-details">
            <div>
              <span class="main-score">${scaledScore}</span>
              <span class="score-of-100">/100</span>
            </div>
            <div class="score-line">Scaled score: <span class="score-value">${scaledScore}</span></div>
            <div class="score-line">Raw score: <span class="score-value">${result.earnedPoints}</span> / ${result.totalPoints}</div>
            <div class="score-line" style="color: #9ca3af">${result.score} / ${result.totalQuestions} questions correct</div>
            <div class="message-box" style="background: ${message.bg}; color: ${message.color}">${message.text}</div>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-item">
            <div class="stat-value">${formatTime(result.averageTime)}</div>
            <div class="stat-label">Avg. Time</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${Object.keys(result.topicAccuracy).length}</div>
            <div class="stat-label">Topics</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" style="color: #f59e0b">${result.missedOnFirstAttemptCount}</div>
            <div class="stat-label">Missed 1st Try</div>
          </div>
        </div>
      </div>

      <div class="right-column">
        <div class="section-title">PERFORMANCE BY TOPIC</div>
        ${sortedTopics.map(([topic, stats]: [string, any]) => `
          <div class="topic-row">
            <div class="topic-name">${topic}</div>
            <div class="topic-bar">
              <div class="topic-fill" style="width: ${stats.percentage}%; background: ${getTopicColor(stats.percentage)}"></div>
            </div>
            <div class="topic-pct">${stats.percentage}%</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="questions-section">
      <div class="questions-title">QUESTION BREAKDOWN</div>
      <div class="two-columns">
        <div class="question-column">
          ${col1.map((q: any) => `
            <div class="question-row ${q.isCorrect ? 'correct-row' : 'incorrect-row'}">
              <div class="q-header">
                <span class="q-num">Q${q.num}</span>
                <span class="q-result ${q.isCorrect ? 'correct-text' : 'incorrect-text'}">${q.isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>
              </div>
              <div class="q-text">${q.questionText}</div>
              ${q.skills ? `<div class="q-skills">${q.skills}</div>` : ''}
              <div class="q-answers">
                <div class="q-answer-item">
                  <div class="q-answer-label ${q.isCorrect ? 'correct-text' : 'incorrect-text'}">Your Answer:</div>
                  <div class="q-answer-text ${q.isCorrect ? 'correct-text' : 'incorrect-text'}">${q.userAnswerText}</div>
                </div>
                ${!q.isCorrect ? `
                <div class="q-answer-item">
                  <div class="q-answer-label correct-text">Correct Answer:</div>
                  <div class="q-answer-text correct-text">${q.correctAnswerText}</div>
                </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        <div class="question-column">
          ${col2.map((q: any) => `
            <div class="question-row ${q.isCorrect ? 'correct-row' : 'incorrect-row'}">
              <div class="q-header">
                <span class="q-num">Q${q.num}</span>
                <span class="q-result ${q.isCorrect ? 'correct-text' : 'incorrect-text'}">${q.isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>
              </div>
              <div class="q-text">${q.questionText}</div>
              ${q.skills ? `<div class="q-skills">${q.skills}</div>` : ''}
              <div class="q-answers">
                <div class="q-answer-item">
                  <div class="q-answer-label ${q.isCorrect ? 'correct-text' : 'incorrect-text'}">Your Answer:</div>
                  <div class="q-answer-text ${q.isCorrect ? 'correct-text' : 'incorrect-text'}">${q.userAnswerText}</div>
                </div>
                ${!q.isCorrect ? `
                <div class="q-answer-item">
                  <div class="q-answer-label correct-text">Correct Answer:</div>
                  <div class="q-answer-text correct-text">${q.correctAnswerText}</div>
                </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  </div>

  <script>
    document.addEventListener("DOMContentLoaded", function() {
      renderMathInElement(document.body, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false},
          {left: '\\\\[', right: '\\\\]', display: true},
          {left: '\\\\(', right: '\\\\)', display: false}
        ],
        throwOnError: false
      });
    });
  </script>
</body>
</html>
  `;
}
