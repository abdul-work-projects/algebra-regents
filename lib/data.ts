import { Question } from './types';

// Sample questions for Algebra I Regents
// In production, these would be loaded from a spreadsheet/database
export const questions: Question[] = [
  {
    id: 'NYREG-ALG1-2025-06-P1-Q01',
    imageFilename: 'question-1.png',
    answers: [
      '(1) 35',
      '(2) 45',
      '(3) 55',
      '(4) 65'
    ],
    correctAnswer: 2,
    explanation: 'To solve this equation, first distribute and combine like terms, then isolate the variable.',
    topics: ['Solving Linear Equations', 'Algebraic Manipulation']
  },
  {
    id: 'NYREG-ALG1-2025-06-P1-Q02',
    imageFilename: 'question-2.png',
    answers: [
      '(1) x = -3',
      '(2) x = 3',
      '(3) x = -2',
      '(4) x = 2'
    ],
    correctAnswer: 1,
    explanation: 'Factor the quadratic expression and set each factor equal to zero to find the solutions.',
    topics: ['Solving Quadratic Equations', 'Factoring']
  },
  {
    id: 'NYREG-ALG1-2025-06-P1-Q03',
    imageFilename: 'question-3.png',
    answers: [
      '(1) y = 2x + 3',
      '(2) y = -2x + 3',
      '(3) y = 2x - 3',
      '(4) y = -2x - 3'
    ],
    correctAnswer: 3,
    explanation: 'Use the slope-intercept form y = mx + b. Calculate the slope using two points and find the y-intercept.',
    topics: ['Linear Functions', 'Slope-Intercept Form']
  },
  {
    id: 'NYREG-ALG1-2025-06-P1-Q04',
    imageFilename: 'question-4.png',
    answers: [
      '(1) 24',
      '(2) 32',
      '(3) 40',
      '(4) 48'
    ],
    correctAnswer: 4,
    explanation: 'Substitute the given values into the expression and simplify step by step.',
    topics: ['Evaluating Expressions', 'Order of Operations']
  },
  {
    id: 'NYREG-ALG1-2025-06-P1-Q05',
    imageFilename: 'question-5.png',
    answers: [
      '(1) x < -5',
      '(2) x > -5',
      '(3) x ≤ -5',
      '(4) x ≥ -5'
    ],
    correctAnswer: 2,
    explanation: 'Solve the inequality by isolating the variable. Remember to flip the inequality sign when multiplying or dividing by a negative number.',
    topics: ['Solving Inequalities', 'Algebraic Manipulation']
  },
  {
    id: 'NYREG-ALG1-2025-06-P1-Q06',
    imageFilename: 'question-6.png',
    answers: [
      '(1) (2, 3)',
      '(2) (3, 2)',
      '(3) (-2, 3)',
      '(4) (3, -2)'
    ],
    correctAnswer: 1,
    explanation: 'Use substitution or elimination method to solve the system of equations.',
    topics: ['Systems of Equations', 'Substitution Method']
  },
  {
    id: 'NYREG-ALG1-2025-06-P1-Q07',
    imageFilename: 'question-7.png',
    answers: [
      '(1) 3x² + 5x - 2',
      '(2) 3x² - 5x + 2',
      '(3) 3x² + 5x + 2',
      '(4) 3x² - 5x - 2'
    ],
    correctAnswer: 1,
    explanation: 'Combine like terms by adding or subtracting the coefficients of terms with the same degree.',
    topics: ['Polynomial Operations', 'Combining Like Terms']
  },
  {
    id: 'NYREG-ALG1-2025-06-P1-Q08',
    imageFilename: 'question-8.png',
    answers: [
      '(1) 16',
      '(2) 25',
      '(3) 36',
      '(4) 49'
    ],
    correctAnswer: 3,
    explanation: 'Use the Pythagorean theorem: a² + b² = c² where c is the hypotenuse.',
    topics: ['Pythagorean Theorem', 'Geometry Applications']
  },
  {
    id: 'NYREG-ALG1-2025-06-P1-Q09',
    imageFilename: 'question-9.png',
    answers: [
      '(1) x(x + 5)',
      '(2) x(x - 5)',
      '(3) (x + 5)(x - 5)',
      '(4) (x + 2)(x + 3)'
    ],
    correctAnswer: 1,
    explanation: 'Factor out the greatest common factor (GCF) from all terms.',
    topics: ['Factoring', 'GCF']
  },
  {
    id: 'NYREG-ALG1-2025-06-P1-Q10',
    imageFilename: 'question-10.png',
    answers: [
      '(1) -3',
      '(2) 3',
      '(3) 0',
      '(4) Undefined'
    ],
    correctAnswer: 2,
    explanation: 'The slope of a line is the coefficient of x when the equation is in slope-intercept form (y = mx + b).',
    topics: ['Linear Functions', 'Slope']
  }
];
