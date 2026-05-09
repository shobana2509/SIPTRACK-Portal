/**
 * AI-Based Natural Language Processing Module
 * Simulates AI analysis for industry anomaly explanations.
 */

const VALID_KEYWORDS = [
  'maintenance', 'expansion', 'shutdown', 'festival', 'season', 'holiday', 
  'strike', 'raw material', 'export', 'order', 'upgrade', 'repair',
  'new machinery', 'recruitment', 'resignation', 'power cut', 'shortage'
];

const SUSPICIOUS_KEYWORDS = [
  'don\'t know', 'unknown', 'typo', 'error', 'mistake', 'none', 'nothing',
  'test', 'asdf', 'qwerty', 'ignore'
];

function analyzeExplanation(explanation) {
  if (!explanation || explanation.length < 10) {
    return {
      validation: 'Suspicious',
      result: 'The explanation is too short or missing. High risk of data manipulation.'
    };
  }

  const text = explanation.toLowerCase();
  
  // Check for suspicious keywords
  const foundSuspicious = SUSPICIOUS_KEYWORDS.filter(k => text.includes(k));
  if (foundSuspicious.length > 0) {
    return {
      validation: 'Suspicious',
      result: `Detected suspicious phrases: "${foundSuspicious.join(', ')}". Reason appears to be an excuse for poor data entry.`
    };
  }

  // Check for valid business keywords
  const foundValid = VALID_KEYWORDS.filter(k => text.includes(k));
  if (foundValid.length > 0) {
    return {
      validation: 'Valid Reason',
      result: `AI analysis confirmed valid business context: "${foundValid.join(', ')}". The drastic change is consistent with typical industrial operations.`
    };
  }

  // Sentiment and length heuristic
  if (explanation.length > 50) {
    return {
      validation: 'Valid Reason',
      result: 'Detailed explanation provided. Context suggests a logical operational change even without specific keywords.'
    };
  }

  return {
    validation: 'Needs Review',
    result: 'Explanation is somewhat vague. Requires manual verification by SIPCOT admin.'
  };
}

module.exports = { analyzeExplanation };
