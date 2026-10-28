// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// MOTION.md: nothing bounces. Springs, bouncy entrances and spring settings
// are written only in src/ui/motion.ts; everything else takes its moves.
const MOTION = 'Take the moves from src/ui/motion.ts (MOTION.md: no bounce, springs only there).';

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/ui/motion.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'react-native-reanimated',
          importNames: ['withSpring', 'ZoomIn', 'ZoomOut', 'ZoomInDown', 'ZoomInUp', 'ZoomOutDown', 'ZoomOutUp', 'ZoomInEasyDown', 'ZoomInEasyUp', 'ZoomOutEasyDown', 'ZoomOutEasyUp',
            'BounceIn', 'BounceInDown', 'BounceInUp', 'BounceInLeft', 'BounceInRight', 'BounceOut', 'BounceOutDown', 'BounceOutUp', 'BounceOutLeft', 'BounceOutRight'],
          message: MOTION,
        }],
      }],
      'no-restricted-syntax': ['error',
        { selector: "CallExpression[callee.property.name='springify']", message: MOTION },
        { selector: "Property[key.name=/^(damping|stiffness|dampingRatio|overshootClamping)$/]", message: MOTION },
      ],
    },
  },
]);
