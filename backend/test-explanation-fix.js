const QuestionFormatAdapter = require('./adapters/QuestionFormatAdapter');
const GameSettingsService = require('./services/GameSettingsService');

// Test data simulating database question with explanation
const mockDbQuestion = {
  id: 'test-id',
  question_text: 'Test Question?',
  question_type: 'multiple_choice',
  image_url: null,
  explanation_title: 'Test Explanation Title',
  explanation_text: 'This is the explanation text.',
  explanation_image_url: 'https://example.com/explanation.jpg',
  order_index: 0,
  answers: [
    {
      id: 'answer-1',
      answer_text: 'Option A',
      image_url: null,
      is_correct: false,
      order_index: 0,
      answer_explanation: ''
    },
    {
      id: 'answer-2', 
      answer_text: 'Option B',
      image_url: null,
      is_correct: true,
      order_index: 1,
      answer_explanation: ''
    }
  ]
};

const gameSettings = {
  showExplanations: true,
  explanationTime: 40
};

console.log('🧪 Testing explanation data mapping fix...\n');

// Test the QuestionFormatAdapter transformation
const adapter = new QuestionFormatAdapter();
const transformedQuestion = adapter.transformDatabaseToGame(mockDbQuestion, gameSettings);

console.log('📝 Transformed question structure:');
console.log('- question.explanation_title:', transformedQuestion.explanation_title);
console.log('- question.explanation_text:', transformedQuestion.explanation_text);
console.log('- question.explanation_image_url:', transformedQuestion.explanation_image_url);
console.log();

console.log('📝 _dbData structure:');
console.log('- question._dbData.explanation_title:', transformedQuestion._dbData.explanation_title);
console.log('- question._dbData.explanation_text:', transformedQuestion._dbData.explanation_text);
console.log('- question._dbData.explanation_image_url:', transformedQuestion._dbData.explanation_image_url);
console.log();

// Test the shouldShowExplanation function
const shouldShow = GameSettingsService.shouldShowExplanation(transformedQuestion, gameSettings);
console.log('✅ GameSettingsService.shouldShowExplanation result:', shouldShow);

if (shouldShow) {
  console.log('🎉 SUCCESS: Explanation data mapping is working correctly!');
} else {
  console.log('❌ FAILED: Explanation data is not being mapped correctly');
}
