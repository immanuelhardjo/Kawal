/**
 * eslint-plugin-kawal
 *
 * Three rules that translate the product's behavioural spine into a CI gate:
 *   - no-raw-fact-render        : claim/event/relationship payloads must render via <Fact.*>
 *   - no-editorial-tone         : forbidden urgency phrasing in source code & i18n bundles
 *   - no-bahasa-in-identifiers  : identifiers stay in English; user-facing copy stays in i18n
 */

const FACT_PAYLOAD_NAMES = new Set([
  'claim',
  'claimText',
  'claimSummary',
  'event',
  'eventTitle',
  'eventSummary',
  'relationship',
  'relationshipDescription',
]);

const EDITORIAL_PHRASES = [
  // Bahasa Indonesia (primary — these are what would ship)
  'mengejutkan',
  'sudah diduga',
  'menghebohkan',
  'fantastis',
  'gempar',
  'sensasional',
  // English equivalents that might leak into code identifiers / comments
  'shocking',
  'as expected',
  'explosive',
  'stunning',
  'breaking news',
];

// Common Bahasa Indonesia words that should NOT appear as identifiers.
// Tight allow-list of domain terms that DO appear in code (Bahasa proper nouns
// for the product — these are accepted because they are the canonical names).
const BAHASA_DOMAIN_ALLOWED = new Set([
  'kawal',
  'kasus',
  'beranda',
  'dosier',
  'profil',
  'glosarium',
  'peta',
  'garis',
  'waktu',
  'tokoh',
  'institusi',
  'perusahaan',
  'dokumen',
  'inkracht',
  'putusan',
  'tanggapan',
  'tanggal',
  'bahasa',
]);
// Heuristic list of Bahasa words that signal a translation in code.
const BAHASA_DETECT = [
  'untuk',
  'dengan',
  'tidak',
  'sudah',
  'belum',
  'adalah',
  'ialah',
  'silakan',
  'simpan',
  'hapus',
  'kembali',
  'masuk',
  'keluar',
  'pengguna',
  'pengaturan',
  'tampilkan',
  'sembunyikan',
];

module.exports = {
  rules: {
    'no-raw-fact-render': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Forbid rendering claim/event/relationship payloads outside of the <Fact.*> primitives in packages/ui',
        },
        schema: [],
        messages: {
          rawRender:
            'Render fact-bearing payloads through <Fact.Claim> / <Fact.Event> / <Fact.RelationshipEdge> so certainty + source are guaranteed.',
        },
      },
      create(context) {
        return {
          JSXExpressionContainer(node) {
            // Inside a JSX child: { someClaim }, { event.summary }, { claim }
            const expr = node.expression;
            const flagName = (n) => FACT_PAYLOAD_NAMES.has(n);
            let candidate = null;
            if (expr && expr.type === 'Identifier') candidate = expr.name;
            if (expr && expr.type === 'MemberExpression' && expr.property && expr.property.type === 'Identifier') {
              candidate = expr.property.name;
            }
            if (candidate && flagName(candidate)) {
              // Allow inside <Fact.* /> opening element
              const openingEl = node.parent && node.parent.openingElement;
              const elName = openingEl && openingEl.name;
              if (elName && elName.type === 'JSXMemberExpression' && elName.object && elName.object.name === 'Fact') {
                return;
              }
              context.report({ node, messageId: 'rawRender' });
            }
          },
        };
      },
    },

    'no-editorial-tone': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Forbid editorial / urgency phrases in source code, comments, and i18n bundles',
        },
        schema: [],
        messages: {
          forbidden: 'Editorial-tone phrase "{{phrase}}" is on the deny-list; use a calmer formulation.',
        },
      },
      create(context) {
        function scan(text, node) {
          const lower = text.toLowerCase();
          for (const phrase of EDITORIAL_PHRASES) {
            if (lower.includes(phrase)) {
              context.report({ node, messageId: 'forbidden', data: { phrase } });
              return;
            }
          }
        }
        return {
          Literal(node) {
            if (typeof node.value === 'string') scan(node.value, node);
          },
          TemplateElement(node) {
            scan(node.value.cooked || '', node);
          },
        };
      },
    },

    'no-bahasa-in-identifiers': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Identifiers stay in English; Bahasa Indonesia belongs in user-facing copy (i18n bundles, *.bahasa.ts)',
        },
        schema: [],
        messages: {
          bahasa:
            'Identifier "{{name}}" appears to be Bahasa Indonesia. Use English in code; Bahasa in user-facing copy files only.',
        },
      },
      create(context) {
        const filename = context.getFilename ? context.getFilename() : '';
        const isCopyFile = /(\bi18n\b|\.bahasa\.ts$)/.test(filename);
        if (isCopyFile) return {};
        function check(node, name) {
          if (!name || typeof name !== 'string') return;
          const norm = name.toLowerCase().replace(/[^a-z]+/g, ' ').trim();
          if (!norm) return;
          // Skip allowed Kawal proper-nouns
          if (norm.split(/\s+/).every((w) => BAHASA_DOMAIN_ALLOWED.has(w))) return;
          if (BAHASA_DETECT.some((w) => norm.split(/\s+/).includes(w))) {
            context.report({ node, messageId: 'bahasa', data: { name } });
          }
        }
        return {
          VariableDeclarator(node) {
            if (node.id && node.id.type === 'Identifier') check(node, node.id.name);
          },
          FunctionDeclaration(node) {
            if (node.id) check(node, node.id.name);
          },
          ClassDeclaration(node) {
            if (node.id) check(node, node.id.name);
          },
          TSInterfaceDeclaration(node) {
            if (node.id) check(node, node.id.name);
          },
          TSTypeAliasDeclaration(node) {
            if (node.id) check(node, node.id.name);
          },
        };
      },
    },
  },
};
