// Debug Quiz Creation - Add this temporarily to your questionSets.js POST /metadata route
// Add these console.log statements right before the database INSERT

console.log('=== QUIZ CREATION DEBUG ===');
console.log('1. Request Headers:', {
  authorization: req.headers.authorization?.substring(0, 50) + '...',
  'content-type': req.headers['content-type']
});

console.log('2. Authenticated User (req.user):', {
  id: req.user?.id,
  email: req.user?.email,
  name: req.user?.name
});

console.log('3. User Token (req.userToken):', {
  tokenExists: !!req.userToken,
  tokenLength: req.userToken?.length,
  tokenStart: req.userToken?.substring(0, 50) + '...'
});

console.log('4. Request Body:', req.body);

console.log('5. Question Set Data to Insert:', questionSetData);

// Add after creating userSupabase client
console.log('6. User Supabase Client Created:', {
  clientExists: !!userSupabase,
  hasAuth: !!userSupabase.auth
});

// Add right before the INSERT operation
console.log('7. About to INSERT with user-scoped client...');

// Add after the INSERT operation (whether success or error)
if (error) {
  console.error('8. INSERT ERROR:', {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint
  });
} else {
  console.log('8. INSERT SUCCESS:', {
    questionSetId: questionSet?.id,
    userId: questionSet?.user_id
  });
}

console.log('=== END DEBUG ===');
