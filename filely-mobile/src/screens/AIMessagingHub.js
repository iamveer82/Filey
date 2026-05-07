import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, Modal, Image, ActivityIndicator,
  Keyboard,
} from 'react-native';
import Animated, {
  FadeInDown, FadeInUp, FadeIn, Layout,
  useSharedValue, useAnimatedStyle, withSpring, withRepeat,
  withSequence, withTiming, withDelay, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { scanReceipt, scanReceiptBulk, scanReceiptMerged } from '../services/receiptPipeline';
import { checkDuplicate, recordSeen } from '../services/dedup';
import { computeNudges } from '../services/nudges';
import { extractMentions, resolveMentions, notifyMentions } from '../services/mentions';
import { checkCap } from '../services/policy';
import { detectAnomaly } from '../services/aiInsights';
import { maybeBuildWeeklyDigest } from '../services/weeklyDigest';
import TransactionEditor from '../components/TransactionEditor';
import VatSummaryModal from '../components/VatSummaryModal';
import { categoryById } from '../services/categories';
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
import { send as llmSend, getPreference as getLLMPref, setPreference, PROVIDERS, getRecentModels, recordModelUse, modelTagline } from '../services/llmProvider';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';
import { exportCSV, exportPDF } from '../services/exportLedger';
import { exportPeppolBatch } from '../services/eInvoiceExport';
import { pickPdf, convertPdfToWord, convertPdfToExcel } from '../services/pdfConverter';
import { seedVersion } from '../services/txVersioning';
import ClaudeSidebar from '../components/ClaudeSidebar';
import ErrorBoundary from '../components/ErrorBoundary';
import ChatInputBox from '../components/ChatInputBox';
import {
  ensureActiveThread, msgKey, memKey, setActiveThreadId as setActiveThreadIdPersist,
  deriveTitle, renameThread, touchThread, createThread,
} from '../services/threads';
import { TOOL_SCHEMAS, toAnthropicTools, runTool, normalizeToolCalls } from '../services/aiTools';
import { getPersona, renderPersonaPrompt, updateMirror } from '../services/personaProfile';

import { Colors } from '../theme/colors';

const MAX_MEMORY = 40;

/**
 * Comprehensive NLP money-movement extractor.
 * Handles many natural-language patterns across directions and grammars.
 */
/**
 * Detect a "fix the last entry" intent in the user's message and return a
 * patch that should be applied to the most recent ledger entry. Returns null
 * if the message isn't an update request.
 *
 * Examples handled:
 *   "change the name to Ravi"
 *   "rename to Veer"
 *   "actually it's Amazon"
 *   "fix the amount to 5,000"
 *   "make it a credit" / "make it a debit" / "actually it was incoming"
 */
function parseUpdateIntent(text) {
  if (!text) return null;
  const patch = {};

  // Counterparty / name updates — broadened.
  const nameRe1 = /\b(?:change|update|rename|set|fix|correct)\s+(?:the\s+)?(?:name|counterparty|merchant|payer|payee|sender|receiver|party|recipient)\s+(?:to|as)\s+["']?([A-Za-z][\w\s\-\.&]{0,40}?)["']?\s*$/i;
  const nameRe2 = /\brename\s+(?:it|that|last|the\s+last\s+(?:one|tx|transaction|entry))?\s*(?:to|as)\s+["']?([A-Za-z][\w\s\-\.&]{0,40}?)["']?\s*$/i;
  const nameRe3 = /\b(?:change|update)\s+(?:it|the\s+(?:name|counterparty))\s+(?:to|as)\s+["']?([A-Za-z][\w\s\-\.&]{0,40}?)["']?\s*$/i;
  const nameRe4 = /\bactually\s+(?:it'?s|that'?s|its)\s+["']?([A-Za-z][\w\s\-\.&]{0,40}?)["']?\s*$/i;
  // "the name should be X" / "the name was X not Y" — captures the corrected name.
  const nameRe5 = /\b(?:the\s+)?name\s+(?:should\s+(?:be|have\s+been)|was|is)\s+["']?([A-Za-z][\w\s\-\.&]{0,40}?)["']?(?:\s*,?\s*not\s+.+)?$/i;
  // Direction-word guard: don't capture "credit"/"debit"/etc as a counterparty.
  const DIRECTION_WORDS_RE = /^(?:credit(?:ed|ing)?|debit(?:ed|ing)?|incoming|outgoing|in|out|inflow|outflow|deposit(?:ed|ing)?|received?|recieved?|recived?|paid|pay(?:ing)?|spent|charge(?:d|ing)?)$/i;
  for (const re of [nameRe1, nameRe2, nameRe3, nameRe4, nameRe5]) {
    const m = text.match(re);
    if (m && m[1]) {
      let name = m[1].trim().replace(/^(the|a|an|my|me)\s+/i, '');
      name = name.split(/\s+and\s+|[,;.]/i)[0].trim();
      if (name && name.length >= 1 && !DIRECTION_WORDS_RE.test(name)) {
        patch.counterparty = name;
        break;
      }
    }
  }

  // Amount updates: "change the amount to 5000", "actually it was 6000", "fix amount 1,200",
  //                "no it was 10000", "the amount was 5000 not 100", "it was 600 not 500".
  const amtRe1 = /\b(?:change|update|set|fix|correct)\s+(?:the\s+)?amount\s+(?:to|=)?\s*(-?[0-9][0-9,\.]*)/i;
  const amtRe2 = /\b(?:actually|wait|sorry|no(?:,)?|i\s+meant|hmm,?)\s+(?:it\s+(?:was|is)\s+|the\s+amount\s+(?:was|is)\s+)?(-?[0-9][0-9,\.]*)/i;
  const amtRe3 = /\b(?:make\s+it|change\s+it\s+to|set\s+it\s+to|amount\s+(?:was|is))\s+(-?[0-9][0-9,\.]*)/i;
  const amtRe4 = /\bthe\s+amount\s+(?:was|is)\s+(-?[0-9][0-9,\.]*)/i;
  // "it was 600 not 500" / "it should be 600 not 500" / "should be 1000"
  const amtRe5 = /\b(?:it|that|the\s+amount|this)\s+(?:was|is|should\s+(?:be|have\s+been))\s+(-?[0-9][0-9,\.]*)/i;
  const amtRe6 = /\b(?:should\s+(?:be|have\s+been)|meant\s+to\s+(?:be|say))\s+(-?[0-9][0-9,\.]*)/i;
  for (const re of [amtRe1, amtRe2, amtRe3, amtRe4, amtRe5, amtRe6]) {
    const m = text.match(re);
    if (m && m[1]) {
      const amt = parseFloat(m[1].replace(/,/g, ''));
      if (Number.isFinite(amt) && amt !== 0) { patch.amount = Math.abs(amt); break; }
    }
  }

  // Direction flip — broad.
  const IN_DIR  = '(?:credit(?:ed|ing)?|incoming|in|inflow|deposit(?:ed|ing)?|receiv(?:ed?|ing)|recive(?:d)?|recieve(?:d)?|got|earn(?:ed|ing)?|salary|bonus)';
  const OUT_DIR = '(?:debit(?:ed|ing)?|outgoing|out|outflow|paid|pay(?:ing)?|spent|spend(?:ing)?|charge(?:d|ing)?|withdraw(?:n|al|ing)?|withdrew|deduct(?:ed|ing)?|expense(?:d)?|sent|send(?:ing)?)';
  const FIX_LEAD = '(?:no(?:,)?|wait|sorry|actually|hmm,?|um,?|err,?|hold\\s+on|i\\s+meant|change\\s+(?:it\\s+)?to|make\\s+it|flip\\s+(?:it\\s+)?(?:to)?|switch\\s+(?:it\\s+)?(?:to)?|fix\\s+(?:it\\s+)?(?:to|as)?|correct(?:ion)?\\s*[:,]?|that(?:\'s|\\s+was)?|it(?:\'s|\\s+was)?|its)';

  const flipInRe  = new RegExp(`\\b${FIX_LEAD}\\b[^.!?]{0,30}?\\b(?:a\\s+)?${IN_DIR}\\b`, 'i');
  const flipOutRe = new RegExp(`\\b${FIX_LEAD}\\b[^.!?]{0,30}?\\b(?:a\\s+)?${OUT_DIR}\\b`, 'i');

  const bareInRe  = new RegExp(`^\\s*(?:a\\s+)?${IN_DIR}\\s*[!.?]?\\s*$|^\\s*(?:make\\s+it|change\\s+to|flip\\s+to|switch\\s+to)\\s+(?:a\\s+)?${IN_DIR}\\s*[!.?]?\\s*$`, 'i');
  const bareOutRe = new RegExp(`^\\s*(?:a\\s+)?${OUT_DIR}\\s*[!.?]?\\s*$|^\\s*(?:make\\s+it|change\\s+to|flip\\s+to|switch\\s+to)\\s+(?:a\\s+)?${OUT_DIR}\\s*[!.?]?\\s*$`, 'i');

  const hasNumber = /\b\d/.test(text);

  if (!hasNumber && (flipInRe.test(text) || bareInRe.test(text))) {
    patch.direction = 'in';
  } else if (!hasNumber && (flipOutRe.test(text) || bareOutRe.test(text))) {
    patch.direction = 'out';
  } else if (hasNumber) {
    if (flipInRe.test(text) && !flipOutRe.test(text)) patch.direction = 'in';
    else if (flipOutRe.test(text) && !flipInRe.test(text)) patch.direction = 'out';
  }

  // Extract counterparty from correction phrases that mention a name with to/from.
  // Catches: "no i paid 500 to Virendra", "actually from Veer", "sorry it was to Amazon".
  if (!patch.counterparty) {
    const partyFromCorrection = text.match(/\b(?:to|from|by|via)\s+([A-Za-z][\w\s\-\.&]{1,35}?)(?:\s*[,.!]|\s*$|\s+actually|\s+not\b)/i);
    if (partyFromCorrection && partyFromCorrection[1]) {
      let name = partyFromCorrection[1].trim();
      name = name.split(/\s+and\s+|[,;.]/i)[0].trim();
      if (name && name.length >= 2 && !DIRECTION_WORDS_RE.test(name)) {
        patch.counterparty = name;
      }
    }
  }

  // Fallback amount: if this is a correction with a number but no amount captured
  // yet, grab any number in the text. Catches "no i paid 500 to Virendra" where
  // the verb sits between lead-in and number.
  if (!patch.amount) {
    const anyNum = text.match(/(-?[0-9][0-9,\.]*)/);
    if (anyNum && anyNum[1]) {
      const amt = parseFloat(anyNum[1].replace(/,/g, ''));
      if (Number.isFinite(amt) && amt !== 0) patch.amount = Math.abs(amt);
    }
  }

  return Object.keys(patch).length ? patch : null;
}

function parseMovementsFallback(text) {
  const out = [];

  // Quick shortcut: explicit signed numbers like "+5000 from Veer", "-200 amazon".
  // Picks up patterns the verb-based regex would miss when user types tersely.
  for (const m of text.matchAll(/([+\-])\s*([0-9][0-9,\.]*)(?:\s+(?:from|to|by|via|at|for)\s+([A-Za-z][\w\s]{0,30}))?/gi)) {
    const sign = m[1];
    const amount = parseFloat((m[2] || '').replace(/,/g, ''));
    if (!amount) continue;
    let party = (m[3] || '').trim();
    party = party.replace(/\s+(and|,|\.|;).*$/i, '');
    party = party.replace(/^(the|a|an|my|me)\s+/i, '');
    if (!party || party.length < 2) party = 'Unknown';
    out.push({ direction: sign === '+' ? 'in' : 'out', amount, counterparty: party });
  }

  // Split clauses on " and " or commas — but NEVER inside a number (so 10,000 stays whole).
  const clauses = text.split(/\s+and\s+|(?<!\d),\s*(?!\d)/i);

  // Noun + verb forms + common typos ("recive", "recieve", "paied", "trasnferred").
  const OUT_VERBS = 'paid|paied|paying|pay|sent|sending|send|gave|give|giving|transferred|transfered|transferring|transfer|owe|owed|owing|spent|spend|spending|debited|debiting|debit|charged|charging|charge|withdrew|withdrawn|withdrawing|withdraw|lost|lose|losing|donated|donating|donate|invested|investing|invest|lent|lending|lend|loaded|loading|topped.?up|booked|booking|book|bought|buying|buy|purchased|purchasing|purchase|ordered|ordering|order|paid.?out|deducted|deducting|deduct|billed|billing|bill|cleared|clearing|clear|settled|settling|settle|sunk|dropped|drop|blew|spent.?on|outflow|disbursed|disbursing|disburse|wired|wiring|wire|expensed|expensing|expense';
  const IN_VERBS = 'received|receiving|receive|recive|recieve|recived|recieved|reciving|recieving|got|getting|get|collected|collecting|collect|credited|crediting|credit|credted|crdited|deposited|depositing|deposit|deposted|refunded|refunding|refund|reimbursed|reimbursing|reimburse|returned|returning|return|earned|earning|earn|won|winning|win|gifted|gifting|gift|borrowed|borrowing|borrow|cashback|cash.?back|salary|sallary|bonus|dividend|comission|commission|added|adding|incoming|inflow|landed|landing|came.?in|hit|banked|banking|bank|pocketed|pocketing|pocket|made|making|make|fetched|fetching|fetch|scored|scoring|score|snagged|snagging|snag';
  const DIRECTION_WORDS = `${OUT_VERBS}|${IN_VERBS}`;
  const CURRENCY = 'aed|dhs|dirhams?|rs|rupees?|inr|usd|\$|€|£|sar|qar|bhd|kwd|omr';

  for (const clause of clauses) {
    const lower = clause.toLowerCase();

    // Skip if no number present
    if (!/\d/.test(clause)) continue;
    console.log('[parseMovementsFallback] clause:', clause);

    // Each entry: { re, dir, amt, party }. amt/party are 1-based group indices
    // (party = 0 means no counterparty captured).
    // ORDER MATTERS — first match wins. Specific name-first patterns must run
    // before generic verb-first patterns or the counterparty gets lost.
    const patterns = [
      // -------- Name-first (specific, run first) --------
      // "Amazon charged me 200"  | "the bank deducted 50"
      { re: new RegExp(`([A-Za-z][\\w\\s]{0,20})\\s+(?:charged|billed|debited|deducted|took|took\\s+from)\\s+(?:me\\s+)?([0-9][0-9,\\.]*)`, 'i'), dir: 'out', amt: 2, party: 1 },
      // "Veer paid me 10,000" — REQUIRES "me" so "I paid 10,000" doesn't get tagged IN.
      { re: new RegExp(`([A-Za-z][\\w\\s]{0,20})\\s+(?:sent|gave|paid|transferred|returned|refunded|reimbursed|deposited|credited)\\s+me\\s+([0-9][0-9,\\.]*)`, 'i'), dir: 'in', amt: 2, party: 1 },

      // -------- High-priority IN-side shortcuts --------
      // verb + amount + from party        (e.g. "received 5000 from Veer" | "credit of 5000 from Veer")
      { re: new RegExp(`\\b(${IN_VERBS})\\b(?:\\s+(?:of|with|via))?\\s*(?:${CURRENCY}\\s+)?([0-9][0-9,\\.]*)\\s*(?:${CURRENCY})?\\s+(?:from|by|via)\\s+([A-Za-z][\\w\\s]{0,30})`, 'i'), dir: 'in', amt: 2, party: 3 },
      // verb + amount  no party           (e.g. "received 5000" | "credit of 200" | "credited AED 5000")
      { re: new RegExp(`\\b(${IN_VERBS})\\b(?:\\s+(?:of|with|via))?\\s*(?:${CURRENCY}\\s+)?([0-9][0-9,\\.]*)\\s*(?:${CURRENCY})?`, 'i'), dir: 'in', amt: 2, party: 0 },
      // amount + verb + from party        (e.g. "5000 was credited from HR" | "AED 5000 credited by Veer")
      { re: new RegExp(`(?:${CURRENCY}\\s+)?([0-9][0-9,\\.]*)\\s*(?:${CURRENCY})?\\s+(?:was\\s+|has\\s+been\\s+)?\\b(${IN_VERBS})\\b\\s+(?:from|by|via)\\s+([A-Za-z][\\w\\s]{0,30})`, 'i'), dir: 'in', amt: 1, party: 3 },
      // amount + verb  no party           (e.g. "5000 credited" | "AED 5000 received")
      { re: new RegExp(`(?:${CURRENCY}\\s+)?([0-9][0-9,\\.]*)\\s*(?:${CURRENCY})?\\s+(?:was\\s+|has\\s+been\\s+)?\\b(${IN_VERBS})\\b`, 'i'), dir: 'in', amt: 1, party: 0 },

      // -------- OUT-side core --------
      // verb + amount + to party          (e.g. "paid 100 to Ravi" | "sent 1,000 AED to Veer")
      { re: new RegExp(`\\b(${OUT_VERBS})\\b(?:\\s+[A-Za-z]+){0,4}\\s*([0-9][0-9,\\.]*)\\s*(?:${CURRENCY})?(?:\\s+(?:to|for|by|at|towards?|into?))\\s+([A-Za-z][\\w\\s]{0,30})`, 'i'), dir: 'out', amt: 2, party: 3 },
      // amount + verb + to party
      { re: new RegExp(`([0-9][0-9,\\.]*)\\s*(?:${CURRENCY})?(?:\\s+[A-Za-z]+){0,4}\\s*\\b(${OUT_VERBS})\\b(?:\\s+(?:to|for|by|at))\\s+([A-Za-z][\\w\\s]{0,30})`, 'i'), dir: 'out', amt: 1, party: 3 },
      // amount + verb  no party
      { re: new RegExp(`([0-9][0-9,\\.]*)\\s*(?:${CURRENCY})?(?:\\s+[A-Za-z]+){0,3}\\s*\\b(${OUT_VERBS})\\b`, 'i'), dir: 'out', amt: 1, party: 0 },
      // verb + amount  no party
      { re: new RegExp(`\\b(${OUT_VERBS})\\b(?:\\s+[A-Za-z]+){0,3}\\s*([0-9][0-9,\\.]*)\\s*(?:${CURRENCY})?`, 'i'), dir: 'out', amt: 2, party: 0 },

      // -------- "<noun> of N was <verb>" --------
      // "my salary of 5000 was credited"
      { re: new RegExp(`(?:my\\s+)?([A-Za-z][\\w\\s]{0,15})\\s+of\\s+([0-9][0-9,\\.]*)\\s*(?:${CURRENCY})?(?:\\s+[A-Za-z]+){0,3}\\s*(?:was\\s+)?(?:${IN_VERBS})`, 'i'), dir: 'in', amt: 2, party: 1 },
      { re: new RegExp(`(?:my\\s+)?([A-Za-z][\\w\\s]{0,15})\\s+of\\s+([0-9][0-9,\\.]*)\\s*(?:${CURRENCY})?(?:\\s+[A-Za-z]+){0,3}\\s*(?:was\\s+)?(?:${OUT_VERBS})`, 'i'), dir: 'out', amt: 2, party: 1 },

      // -------- "I was/got <verb> N" --------
      { re: new RegExp(`(?:i\\s+(?:was|got|am|have\\s+been)\\s+)?(?:${OUT_VERBS})\\s+(?:me\\s+)?([0-9][0-9,\\.]*)`, 'i'), dir: 'out', amt: 1, party: 0 },
      { re: new RegExp(`(?:i\\s+(?:was|got|am|have\\s+been)\\s+)?(?:${IN_VERBS})\\s+(?:me\\s+)?([0-9][0-9,\\.]*)`, 'i'), dir: 'in', amt: 1, party: 0 },
    ];

    let found = null;
    for (const p of patterns) {
      const m = clause.match(p.re);
      if (m) {
        const rawAmt = m[p.amt];
        const amount = parseFloat((rawAmt || '').replace(/,/g, ''));
        if (amount) {
          const rawParty = p.party > 0 ? m[p.party] : null;
          // Sanity: if the captured "name" is itself a direction verb, treat as no-party.
          const partyClean = (rawParty || '').toLowerCase().replace(/[^a-z]/g, '');
          const isVerbName = partyClean && new RegExp(`^(${OUT_VERBS}|${IN_VERBS})$`, 'i').test(partyClean);
          found = { amount, dir: p.dir, rawParty: isVerbName ? null : rawParty, verb: (m[1] || '').toLowerCase() };
          console.log('[parseMovementsFallback] match:', { src: p.re.source.slice(0, 60), dir: p.dir, amount, rawParty: found.rawParty });
          break;
        }
      }
    }

    if (!found) {
      // Last resort: find any number near a direction word in the clause.
      // Allow numbers like 10,000 / 1.234,56 / 1234.56 by accepting , and . inside.
      const words = clause.split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        const w = words[i].toLowerCase().replace(/[^a-z]/g, '');
        const isOut = new RegExp(`\\b(${OUT_VERBS})\\b`, 'i').test(w);
        const isIn = new RegExp(`\\b(${IN_VERBS})\\b`, 'i').test(w);
        if (!isOut && !isIn) continue;

        // Look ±6 words for a number (loosened from ±3)
        for (let j = Math.max(0, i - 6); j <= Math.min(words.length - 1, i + 6); j++) {
          const numMatch = words[j].match(/^([0-9][0-9,\.]*)$/);
          if (numMatch) {
            const amount = parseFloat(numMatch[1].replace(/,/g, ''));
            if (amount) {
              let counterparty = null;
              for (let k = Math.max(0, j - 2); k <= Math.min(words.length - 1, j + 4); k++) {
                const prep = words[k].toLowerCase().replace(/[^a-z]/g, '');
                if (['to','from','by','at','for','via'].includes(prep) && k + 1 < words.length) {
                  const name = words[k + 1].replace(/[^A-Za-z0-9]/g, '');
                  if (name && name.length > 1 && !/^(me|my|the|a|an|this|that|it|us|we|i)$/i.test(name)) {
                    counterparty = name;
                    break;
                  }
                }
              }
              found = { amount, dir: isOut ? 'out' : 'in', rawParty: counterparty };
              break;
            }
          }
        }
        if (found) break;
      }
    }

    if (!found || !found.amount) continue;

    // Clean counterparty
    let counterparty = (found.rawParty || '').trim();
    counterparty = counterparty.replace(/\s+(and|,|\.|;).*$/i, '');
    counterparty = counterparty.replace(/^(the|a|an|my|me)\s+/i, '');
    if (!counterparty || counterparty.length < 2) counterparty = 'Unknown';

    // Deduplicate: skip if same amount+direction already in this batch
    const key = `${found.dir}:${found.amount}:${counterparty.toLowerCase()}`;
    if (out.some(o => `${o.direction}:${o.amount}:${o.counterparty.toLowerCase()}` === key)) continue;

    out.push({ direction: found.dir, amount: found.amount, counterparty });
    console.log('[parseMovementsFallback] pushed:', { direction: found.dir, amount: found.amount, counterparty });
  }

  console.log('[parseMovementsFallback] returning', out.length, 'items');
  return out;
}

const TOOL_INTENT_RE =/\b(export|download|share|send|generate|create|email)\s+(?:me\s+)?(?:my\s+)?(?:last\s+\d+\s+)?(?:transactions?|movements?|ledger|entries|receipts?)?(?:\s+(?:as|in|to))?\s+(csv|pdf|excel|spreadsheet)\b|\b(csv|pdf|excel|spreadsheet)\s+(?:of|for)\s+(?:my\s+)?(?:transactions?|movements?|ledger|entries)\b|\b(show|open|display).*(vat|summary|reclaim)\b|\b(show|find|search|look\s+up|list|view|display|pull|see)\s+(?:me\s+)?(?:my\s+)?(?:last|recent|latest|newest|past)?\s*\d{0,3}\s*(?:transactions?|movements?|entries|receipts?|tx|logs?|activity)\b|\b(save|add|log|record).*(receipt|tx|transaction|to vault|movement)\b|\b(opening|starting|initial)\s+balance\b|\bbalance\s+(?:starts|begins|opens)\s+at\b|\b(rename|change|update|fix|correct)\s+(?:the\s+)?(?:name|counterparty|merchant|amount|payer|payee|sender|receiver)\b|\bactually\s+(?:it'?s|it\s+(?:was|is))\b|\b(paid|sent|gave|transferred|owe|spent|debited|debit|charged|charge|withdrawn|withdrew|lost|donated|invested|lent|loaded|bought|purchased|booked|ordered|refunded|earned|won|borrowed|credited|credit|deposited|deposit|received|receive|recive|recieve|got|collected|salary|bonus|dividend|commission|reimbursed|cashback)\b.*\b\d/i;

// Does the message sound like the user is correcting/editing a previous entry?
const CORRECTION_RE = /\b(?:no[,!\s]|actually|wait[,!\s]|sorry|i\s+meant|meant\s+to\s+say|should\s+(?:be|have\s+been)|not\s+\d|thats?\s+wrong|that'?s\s+wrong|incorrect|mistake|oops|my\s+bad|change\s+(?:it|that|the|this)|fix\s+(?:it|that|the|this)|update\s+(?:it|that|the|this)|edit|revise|instead|i\s+mean|correction)\b/i;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SpringPressable({ children, style, onPress, disabled, ...rest }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => { scale.value = withSpring(0.95, { damping: 14, stiffness: 420 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 320 }); }}
      style={[style, anim]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

function genId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }

function TypingDots() {
  const d1 = useSharedValue(0.3), d2 = useSharedValue(0.3), d3 = useSharedValue(0.3);
  useEffect(() => {
    const loop = (v, delay) => {
      v.value = withDelay(delay, withRepeat(withSequence(
        withTiming(1, { duration: 380 }), withTiming(0.3, { duration: 380 })
      ), -1, false));
    };
    loop(d1, 0); loop(d2, 130); loop(d3, 260);
  }, []);
  const s1 = useAnimatedStyle(() => ({ opacity: d1.value, transform: [{ scale: d1.value }] }));
  const s2 = useAnimatedStyle(() => ({ opacity: d2.value, transform: [{ scale: d2.value }] }));
  const s3 = useAnimatedStyle(() => ({ opacity: d3.value, transform: [{ scale: d3.value }] }));
  return (
    <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 6, paddingHorizontal: 2 }}>
      <Animated.View style={[styles.dot, s1]} />
      <Animated.View style={[styles.dot, s2]} />
      <Animated.View style={[styles.dot, s3]} />
    </View>
  );
}


export default function AIMessagingHub(props) {
  const { darkMode, navigation } = props;
  const c = Colors[darkMode ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { profile, user, orgId, userId } = useAuth();
  const submitterName = profile?.name || user?.email?.split('@')[0] || 'member';
  const companyName = profile?.company || 'My Company';
  const withOrgContext = (tx) => ({
    ...tx,
    orgId: orgId || 'default',
    submittedBy: userId,
    submittedByName: submitterName,
    submittedAt: new Date().toISOString(),
    status: tx.status || 'pending',
  });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showVatSummary, setShowVatSummary] = useState(false);
  const [activeThread, setActiveThread] = useState(null);
  const [showThreads, setShowThreads] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [recentModels, setRecentModels] = useState([]);
  const [llmPref, setLlmPref] = useState(null);
  const [kbVisible, setKbVisible] = useState(false);
  const scrollRef = useRef();
  const abortRef = useRef(null);
  const lastUserPromptRef = useRef(null);
  const titleSetRef = useRef(false);

  const name = profile?.name || user?.email?.split('@')[0] || 'there';

  useEffect(() => {
    (async () => {
      try {
        const t = await ensureActiveThread();
        setActiveThread(t);
        const raw = await AsyncStorage.getItem(msgKey(t.id));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setMessages(parsed);
            titleSetRef.current = !!parsed.find(m => m.role === 'user');
          }
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const pref = await getLLMPref();
        setLlmPref(pref);
        // Seed recents with current selection if list is empty so first-render
        // dropdown still shows the active model.
        if (pref?.provider && pref?.model) {
          await recordModelUse(pref.provider, pref.model);
        }
        const recents = await getRecentModels(3);
        setRecentModels(recents);
      } catch {}
    })();
  }, []);

  // Refresh llmPref whenever the Chat tab regains focus — e.g. user switched
  // provider/model in the Settings tab and is now back here. Without this the
  // header pill keeps showing the stale model name.
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      try {
        const pref = await getLLMPref();
        if (cancelled) return;
        setLlmPref(pref);
        const recents = await getRecentModels(3);
        if (cancelled) return;
        setRecentModels(recents);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []));

  useEffect(() => {
    if (!activeThread || messages.length === 0) return;
    const recent = messages.slice(-MAX_MEMORY);
    AsyncStorage.setItem(msgKey(activeThread.id), JSON.stringify(recent)).catch(() => {});
  }, [messages, activeThread]);

  // Keyboard visibility tracking — shrink composer's tab-bar gap when keyboard is up.
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, () => setKbVisible(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setKbVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Edge-swipe gesture: drag from left edge of screen to open sidebar.
  const edgeSwipe = Gesture.Pan()
    .activeOffsetX([15, 9999])
    .failOffsetY([-25, 25])
    .onEnd((e) => {
      if (e.translationX > 60 || e.velocityX > 600) {
        runOnJS(setShowThreads)(true);
      }
    });

  const switchThread = useCallback(async (id) => {
    await setActiveThreadIdPersist(id);
    const raw = await AsyncStorage.getItem(msgKey(id));
    const parsed = raw ? JSON.parse(raw) : [];
    setMessages(Array.isArray(parsed) ? parsed : []);
    titleSetRef.current = (Array.isArray(parsed) ? parsed : []).some(m => m.role === 'user');
    // Refresh row meta
    const { listThreads } = require('../services/threads');
    const all = await listThreads();
    setActiveThread(all.find(t => t.id === id) || null);
  }, []);

  // Proactive nudges + weekly digest on mount
  useEffect(() => {
    let mounted = true;
    const t = setTimeout(async () => {
      try {
        const nudges = await computeNudges({ orgId });
        if (mounted && nudges?.length) {
          for (const n of nudges) {
            pushMessage({ role: 'system', kind: 'nudge', severity: n.severity, content: n.text });
          }
        }
        const digest = await maybeBuildWeeklyDigest({ orgId });
        if (mounted && digest?.text) {
          pushMessage({ role: 'assistant', kind: 'digest', content: digest.text, meta: { digestStats: digest.stats } });
        }
      } catch {}
    }, 1400);
    return () => { mounted = false; clearTimeout(t); };
  }, [orgId, pushMessage]);

  const newThread = useCallback(async () => {
    const t = await createThread('New chat');
    setActiveThread(t);
    setMessages([]);
    titleSetRef.current = false;
  }, []);

  const pushMessage = useCallback((m) => {
    setMessages(prev => [...prev, { id: genId(), ts: Date.now(), ...m }]);
  }, []);

  const runTurn = useCallback(async (text, historyOverride) => {
    const history = (historyOverride ?? messages).slice(-12)
      .filter(m => (m.role === 'user' || m.role === 'assistant') && m.content)
      .map(m => ({ role: m.role, content: m.content }));

    let txContext = '';
    const needsData = /advice|summary|spend|spent|spending|budget|savings|report|breakdown|category|vat|tax|owe|reclaim|deduction/i.test(text);
    if (needsData) {
      try {
        const res = await api.getTransactions({ orgId });
        const list = (res?.transactions || res || []).slice(-50);
        if (list.length) {
          const { summarizeVat } = require('../services/categories');
          const sum = summarizeVat(list);
          const top = sum.byCategory.slice(0, 6)
            .map(c => `- ${c.label}: ${c.amt.toFixed(2)} AED (VAT ${c.vat.toFixed(2)}, ×${c.count})`)
            .join('\n');
          txContext = `\n\nUSER TRANSACTION CONTEXT (last ${list.length}):\nTotal: ${sum.totalAmt.toFixed(2)} AED · VAT paid: ${sum.totalVat.toFixed(2)} · Reclaimable: ${sum.reclaimable.toFixed(2)}\nTop categories:\n${top}\nCompany: ${companyName} · Submitter: ${submitterName}`;
        }
      } catch {}
    }

    const persona = await getPersona().catch(() => null);
    const personaBlock = persona ? renderPersonaPrompt(persona) : '';

    const sys = {
      role: 'system',
      content: `You are Filey, a UAE VAT-compliance assistant for ${companyName}. Be concise and direct. Use markdown (bold, lists, headers). Cite [n] when using web results. UAE VAT is 5% (FTA). Users can reclaim VAT on qualifying business expenses only (fuel, utilities, telecom, software, travel, office, legal, hotel).${txContext}

${personaBlock}`,
    };
    const convo = [sys, ...history, { role: 'user', content: text }];

    // Create streaming placeholder message
    const streamId = genId();
    setMessages(prev => [...prev, { id: streamId, ts: Date.now(), role: 'assistant', content: '', streaming: true }]);

    abortRef.current = new AbortController();

    try {
      const out = await llmSend(convo, {
        signal: abortRef.current.signal,
        onToken: (_delta, acc) => {
          setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: acc } : m));
        },
      });
      setMessages(prev => prev.map(m => m.id === streamId
        ? { ...m, content: out.text || m.content || 'No response.', meta: out.meta, streaming: false }
        : m
      ));
    } catch (e) {
      const aborted = e.name === 'AbortError' || /abort/i.test(e.message || '');
      setMessages(prev => prev.map(m => m.id === streamId
        ? { ...m, content: m.content || (aborted ? '_Stopped._' : `Error: ${e.message}. Configure provider in Settings → AI & Integrations.`), streaming: false, aborted }
        : m
      ));
    } finally {
      abortRef.current = null;
    }
  }, [messages, orgId, companyName, submitterName]);

  const runAgenticTurn = useCallback(async (text, historyOverride) => {
    const history = (historyOverride ?? messages).slice(-10)
      .filter(m => (m.role === 'user' || m.role === 'assistant') && m.content)
      .map(m => ({ role: m.role, content: m.content }));

    const pref = await getLLMPref();
    const provider = pref.provider;
    const tools = provider === 'anthropic' ? toAnthropicTools() : TOOL_SCHEMAS;

    const persona = await getPersona().catch(() => null);
    const personaBlock = persona ? renderPersonaPrompt(persona) : '';

    const sys = {
      role: 'system',
      content: `Filey money log for ${companyName}. User: ${submitterName}.

Filey is a manual money tracker. No live bank data. User tells you what happened → you log it. Never ask questions.

HARD RULES:
- OUT: paid/sent/gave/owe/debited/charged/withdrawn/spent/bought/lost/donated/invested/lent X to Y → log_money_movement(direction:"out", amount:X, counterparty:"Y")
- IN: received/got/credited/deposited/refunded/earned/won/borrowed/salary/bonus/dividend X from Y → log_money_movement(direction:"in", amount:X, counterparty:"Y")
- Passive voice also works: "100 was credited", "200 debited by Amazon", "salary of 5000 deposited"
- Multiple in one sentence → multiple parallel tool calls. Never ask user to clarify.
- Missing counterparty → use "Unknown". Missing amount → ask ONLY then.
- Amount is always the GROSS total (VAT-inclusive). Do not split or subtract VAT.
- Amounts may have grouping commas — "10,000 AED" means 10000, not 10. Strip commas before passing to the tool.
- ANY amount, ANY direction must be logged. Whole numbers ("500"), decimals ("199.99"), and large grouped numbers ("1,250,000") are all valid. Never reject a movement because the number looks unusual.
- Never ask about VAT, category, date, currency, notes. Defaults are fine.
- save_transaction (VAT receipt flow) ONLY when user says "receipt" or "invoice". For plain "I received / I paid / credited / debited" sentences, ALWAYS use log_money_movement, never save_transaction. Never ask the user about VAT, sales, category, currency, or notes for plain money movements — those are receipt-only fields.
- Be tolerant of typos: "recive", "recieve", "recived" all mean "received" → IN. "paied" → "paid" → OUT. Never ask the user to clarify a typo, just infer.
- OPENING BALANCE: "set/update/change opening balance to X" | "my starting/initial balance is X" | "balance starts at X" | "begin with X" → set_opening_balance(amount:X). Total Balance = opening + Σ credits − Σ debits.
- UPDATE / RENAME: "change the name to X" | "rename to X" | "fix the amount to X" | "actually it's X" | "make it a credit/debit" → update_transaction(<fields>). If the user does NOT specify which transaction, omit txId and update_transaction will patch the most recent entry.
- LIST: "show me my last N transactions" | "recent movements" | "last 10 entries" → list_money_movements(limit:N) and render the rows as a markdown bullet list. Default N=5 if unspecified.
- EXPORT: "export/download/share as CSV/PDF" → run_export(format:"csv"|"pdf"). Confirm the count of rows shared.
- Reply ≤14 words after tool runs. Format: "Logged: -15,000 to Ravi, +10,000 from Veer." or "Renamed last entry to Ravi." or "Opening balance set to AED 5,000."

${personaBlock}`,
    };
    const convo = [sys, ...history, { role: 'user', content: text }];

    abortRef.current = new AbortController();
    try {
      const first = await llmSend(convo, { signal: abortRef.current.signal, tools, maxTokens: 700 });
      const calls = normalizeToolCalls(first.toolCalls, provider);

      if (!calls.length) {
        // Regex fallback — provider/model didn't call tools. Parse message directly.
        const parsed = parseMovementsFallback(text);
        console.log('[AIMessagingHub] agentic fallback parsed:', parsed);
        if (parsed.length) {
          const { addTx: addLedgerTx } = require('../services/localLedger');
          for (const m of parsed) {
            pushMessage({ role: 'system', content: `⚙ log_money_movement (auto)…` });
            try {
              const entry = await addLedgerTx(m);
              console.log('[AIMessagingHub] agentic addLedgerTx success:', entry);
            } catch (e) {
              console.error('[AIMessagingHub] agentic addLedgerTx FAILED:', e.message);
              pushMessage({ role: 'system', content: `⚠ Failed to log: ${e.message}` });
            }
          }
          try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
          const summary = parsed.map(m => `${m.direction === 'in' ? '+' : '-'}${m.amount.toLocaleString()} ${m.direction === 'in' ? 'from' : 'to'} ${m.counterparty}`).join(', ');
          pushMessage({ role: 'assistant', content: `Logged: ${summary}.` });
          return;
        }
        pushMessage({ role: 'assistant', content: first.text || '…', meta: first.meta });
        return;
      }

      const ctx = { orgId, userId, submitterName, companyName };
      const results = [];
      for (const c of calls) {
        pushMessage({ role: 'system', content: `⚙ ${c.name}…` });
        const r = await runTool(c.name, c.args, ctx);
        results.push({ call: c, out: r });
        if (r.side?.type === 'open_vat_summary') setShowVatSummary(true);
        if (r.ok) {
          try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        }
      }

      const resultSummary = results.map(r =>
        `- ${r.call.name}(${JSON.stringify(r.call.args).slice(0, 120)}) → ${r.out.ok ? JSON.stringify(r.out.result).slice(0, 200) : 'ERR: ' + r.out.error}`
      ).join('\n');

      const wrap = [
        ...convo,
        { role: 'assistant', content: first.text || '(calling tools)' },
        { role: 'user', content: `TOOL RESULTS:\n${resultSummary}\n\nConfirm to the user what happened in 1-2 sentences.` },
      ];

      const streamId = genId();
      setMessages(prev => [...prev, { id: streamId, ts: Date.now(), role: 'assistant', content: '', streaming: true }]);
      const final = await llmSend(wrap, {
        signal: abortRef.current.signal,
        onToken: (_d, acc) => setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: acc } : m)),
      });
      setMessages(prev => prev.map(m => m.id === streamId
        ? { ...m, content: final.text || '✓ Done.', meta: final.meta, streaming: false }
        : m
      ));
    } catch (e) {
      const aborted = e.name === 'AbortError';
      pushMessage({ role: 'assistant', content: aborted ? '_Stopped._' : `Agent error: ${e.message}` });
    } finally {
      abortRef.current = null;
    }
  }, [messages, orgId, userId, submitterName, companyName, pushMessage]);

  const send = useCallback(async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading || !activeThread) return;
    setInput('');
    setLoading(true);
    lastUserPromptRef.current = text;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    pushMessage({ role: 'user', content: text });
    // Persona mirror — observe user's natural style (fire-and-forget)
    updateMirror(text).catch(() => {});

    // @mentions — resolve + notify
    const handles = extractMentions(text);
    if (handles.length) {
      try {
        const members = await resolveMentions(handles, orgId);
        if (members.length) {
          await notifyMentions(members, {
            fromName: submitterName,
            text,
            threadId: activeThread?.id,
          });
          pushMessage({
            role: 'system',
            content: `🔔 Notified ${members.map(m => m.name).join(', ')}`,
          });
        } else {
          pushMessage({
            role: 'system',
            content: `No match for @${handles.join(', @')}. Check team list.`,
          });
        }
      } catch {}
    }

    // Auto-title thread from first user message
    if (!titleSetRef.current) {
      const title = deriveTitle(text);
      renameThread(activeThread.id, title).catch(() => {});
      setActiveThread(t => t ? { ...t, title } : t);
      titleSetRef.current = true;
    } else {
      touchThread(activeThread.id).catch(() => {});
    }

    const pref = await getLLMPref().catch(() => ({ provider: 'gemma' }));
    const canTool = pref.provider === 'openai' || pref.provider === 'anthropic' || pref.provider === 'openrouter';

    // Opening-balance intent — must run BEFORE movementIntent so phrases like
    // "set opening balance to 5000" don't get logged as a credit.
    const openingMatch = text.match(
      /\b(?:set|update|change|make)?\s*(?:my\s+)?(?:opening|starting|initial|begin(?:ning)?)\s+balance\s*(?:to|=|:|is|of)?\s*(-?[0-9][0-9,\.]*)/i
    ) || text.match(
      /\bbalance\s+(?:starts\s+at|begins\s+at|opens\s+at|=)\s*(-?[0-9][0-9,\.]*)/i
    ) || text.match(
      /\bbegin(?:ning)?\s+(?:with|at)\s+(-?[0-9][0-9,\.]*)\s*(?:aed|dhs|dirhams?)?(?:\s+(?:as\s+)?(?:my\s+)?(?:opening|starting)\s+balance)?/i
    );
    if (openingMatch) {
      const raw = (openingMatch[1] || '').replace(/,/g, '');
      const amt = parseFloat(raw);
      if (Number.isFinite(amt)) {
        const { setOpeningBalance } = require('../services/localLedger');
        pushMessage({ role: 'system', content: `⚙ set_opening_balance…` });
        try {
          await setOpeningBalance(amt);
          try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
          pushMessage({
            role: 'assistant',
            content: `Opening balance set to ${amt < 0 ? '-' : ''}AED ${Math.abs(amt).toLocaleString()}.`,
          });
        } catch (e) {
          pushMessage({ role: 'system', content: `⚠ Failed to set opening balance: ${e.message}` });
        }
        setLoading(false);
        return;
      }
    }

    // Export intent — runs BEFORE list intent so "pdf for my last 30 entries"
    // produces a PDF file rather than just an in-chat list.
    const exportMatch = text.match(
      /\b(?:export|download|share|send|generate|create|email)\s+(?:me\s+)?(?:my\s+)?(?:last\s+(\d{1,3})\s+)?(?:transactions?|movements?|ledger|entries)?(?:\s+(?:as|in|to))?\s+(csv|pdf|excel|spreadsheet)\b/i
    ) || text.match(/\b(csv|pdf|excel|spreadsheet)\s+(?:of|for)\s+(?:my\s+)?(?:last\s+(\d{1,3})\s+)?(?:transactions?|movements?|ledger|entries)\b/i)
      || text.match(/^\s*(?:export|download|share|send|generate|create|give\s+me|i\s+want)\s+(?:a\s+|an\s+)?(csv|pdf|excel|spreadsheet)\s*$/i)
      || text.match(/^\s*(csv|pdf|excel|spreadsheet)\s*$/i);
    if (exportMatch) {
      // Find first numeric & first format token in the captures.
      const caps = Array.from(exportMatch).slice(1).filter(Boolean);
      const fmtRaw = (caps.find(c => /^(csv|pdf|excel|spreadsheet)$/i.test(c)) || '').toLowerCase();
      const num = caps.map(c => parseInt(c, 10)).find(n => Number.isFinite(n) && n > 0);
      const fmt = (fmtRaw === 'excel' || fmtRaw === 'spreadsheet') ? 'csv' : fmtRaw;
      const limitArg = num;
      pushMessage({ role: 'system', content: `⚙ generating ${fmt.toUpperCase()}…` });
      try {
        const { exportMovementsCSV, exportMovementsPDF } = require('../services/movementExports');
        const out = fmt === 'pdf'
          ? await exportMovementsPDF({ limit: limitArg })
          : await exportMovementsCSV({ limit: limitArg });
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        pushMessage({
          role: 'assistant',
          content: `Shared ${fmt.toUpperCase()} — ${out.count} entries · balance AED ${(+out.balance || 0).toLocaleString()}.`,
        });
      } catch (e) {
        pushMessage({ role: 'system', content: `⚠ Export failed: ${e.message}` });
      }
      setLoading(false);
      return;
    }

    // List intent — "show me my last 5 transactions" / "show last 10 movements"
    // Pulls straight from local ledger and renders inline as an assistant
    // message — no LLM round-trip needed.
    const listMatch = text.match(
      /\b(?:show|list|view|display|pull|give|see)\s+(?:me\s+)?(?:my\s+)?(?:last|recent|latest|newest|past)?\s*(\d{1,3})?\s*(?:last|recent|latest|newest)?\s*(?:transactions?|movements?|entries|tx|logs?|activity)\b/i
    ) || text.match(/\bmy\s+last\s+(\d{1,3})?\s*(?:transactions?|movements?|entries)\b/i);
    if (listMatch) {
      const count = Math.min(Math.max(parseInt(listMatch[1] || '5', 10) || 5, 1), 50);
      const { listTx } = require('../services/localLedger');
      const items = await listTx({ limit: count });
      if (!items.length) {
        pushMessage({ role: 'assistant', content: `No transactions yet. Tell me about one — e.g. "I paid 500 to Ravi".` });
      } else {
        const lines = items.map(t => {
          const sign = t.direction === 'in' ? '+' : '-';
          const amt = Math.abs(+t.amount || 0).toLocaleString();
          const date = t.date || (t.ts ? new Date(+t.ts).toISOString().slice(0, 10) : '');
          const note = t.note ? ` — ${t.note}` : (t.category ? ` — ${t.category}` : '');
          return `- **${sign}AED ${amt}** · ${t.counterparty || 'Unknown'} · ${date}${note}`;
        }).join('\n');
        pushMessage({
          role: 'assistant',
          content: `**Last ${items.length} transaction${items.length === 1 ? '' : 's'}:**\n${lines}`,
        });
      }
      setLoading(false);
      return;
    }

    // Update / correction intent. If provider supports tools, let the LLM
    // understand the correction and call update_transaction. Regex only as
    // fallback for non-tool providers (Gemma).
    const isCorrection = CORRECTION_RE.test(text);
    if (isCorrection && canTool) {
      // Skip regex — let LLM comprehend + update.
      await runAgenticTurn(text);
      setLoading(false);
      return;
    }
    if (isCorrection && !canTool) {
      // No tools available — regex fallback.
      const updatePatch = parseUpdateIntent(text);
      if (updatePatch) {
        const { updateLastTx } = require('../services/localLedger');
        pushMessage({ role: 'system', content: `⚙ update_transaction…` });
        try {
          const updated = await updateLastTx(updatePatch);
          if (!updated) {
            pushMessage({ role: 'assistant', content: `Nothing to update — log a transaction first.` });
          } else {
            try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
            const parts = [];
            if (updatePatch.counterparty != null) parts.push(`name → ${updated.counterparty}`);
            if (updatePatch.amount != null) parts.push(`amount → AED ${Math.abs(updated.amount).toLocaleString()}`);
            if (updatePatch.direction != null) parts.push(`direction → ${updated.direction === 'in' ? 'credit' : 'debit'}`);
            pushMessage({ role: 'assistant', content: `Updated last entry: ${parts.join(', ') || 'no change'}.` });
          }
        } catch (e) {
          pushMessage({ role: 'system', content: `⚠ Update failed: ${e.message}` });
        }
        setLoading(false);
        return;
      }
    }

    const MOVE_VERBS = 'paid|paied|pay|sent|send|gave|give|transferred|transfered|transfer|owe|spent|spend|debited|debit|charged|charge|withdrawn|withdrew|withdraw|lost|donated|invested|lent|lend|loaded|bought|buy|purchased|purchase|booked|ordered|refunded|refund|earned|earn|won|win|borrowed|borrow|credited|credit|credted|deposited|deposit|received|receive|recive|recieve|recived|recieved|got|get|collected|collect|salary|sallary|bonus|dividend|commission|reimbursed|reimburse|cashback|added|incoming|inflow|landed|hit|banked|bank|pocketed|fetched|scored|snagged|cleared|settled|wired|disbursed|expensed';
    // \d[\d,\.]* lets "10,000" / "1.234,56" / "1234.56" all count as a number.
    // Also fire on signed prefix (+5000 / -200) — handled by parser as a shortcut.
    const movementIntent =
      /[+\-]\s*\d[\d,\.]*/.test(text) ||
      new RegExp(`\\d[\\d,\\.]*.*\\b(${MOVE_VERBS})\\b|\\b(${MOVE_VERBS})\\b.*\\d[\\d,\\.]*`, 'i').test(text);
    if (movementIntent) {
      const parsed = parseMovementsFallback(text);
      console.log('[AIMessagingHub] movementIntent matched, parsed:', parsed);
      if (parsed.length) {
        const { addTx: addLedgerTx } = require('../services/localLedger');
        for (const m of parsed) {
          pushMessage({ role: 'system', content: `⚙ log_money_movement…` });
          try {
            const entry = await addLedgerTx(m);
            console.log('[AIMessagingHub] addLedgerTx success:', entry);
          } catch (e) {
            console.error('[AIMessagingHub] addLedgerTx FAILED:', e.message);
            pushMessage({ role: 'system', content: `⚠ Failed to log: ${e.message}` });
          }
        }
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        const summary = parsed.map(m => `${m.direction === 'in' ? '+' : '-'}${m.amount.toLocaleString()} ${m.direction === 'in' ? 'from' : 'to'} ${m.counterparty}`).join(', ');
        pushMessage({ role: 'assistant', content: `Logged: ${summary}.` });
        setLoading(false);
        return;
      }
    }
    // Route to agentic turn for tool-heavy intents. Corrections already
    // handled above with early return.
    if (canTool && TOOL_INTENT_RE.test(text)) {
      await runAgenticTurn(text);
    } else {
      await runTurn(text);
    }
    setLoading(false);
  }, [input, loading, activeThread, orgId, submitterName, pushMessage, runTurn, runAgenticTurn]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
  }, []);

  const showMessageActions = useCallback((m) => {
    if (!m.content) return;
    try { Haptics.selectionAsync(); } catch {}
    Alert.alert('Message', '', [
      { text: 'Copy', onPress: async () => {
        await Clipboard.setStringAsync(m.content);
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      }},
      { text: 'Share', onPress: async () => {
        try { await Share.share({ message: m.content }); } catch {}
      }},
      { text: 'Report correction', onPress: () => {
        pushMessage({ role: 'system', content: 'Noted. Correction queued for model retraining.' });
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [pushMessage]);

  const regenerate = useCallback(async () => {
    if (loading) return;
    // Remove last assistant message, re-run with last user prompt
    let lastUserText = lastUserPromptRef.current;
    let cutoff = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && !messages[i].extractedTransaction && !messages[i].kind) {
        cutoff = i;
        break;
      }
    }
    if (cutoff < 0 || !lastUserText) return;
    const trimmed = messages.slice(0, cutoff);
    setMessages(trimmed);
    setLoading(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    await runTurn(lastUserText, trimmed);
    setLoading(false);
  }, [loading, messages, runTurn]);

  const runScan = useCallback(async (source) => {
    setScanning(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    pushMessage({
      role: 'system',
      content: source === 'camera' ? 'Opening camera…' : 'Opening photo library…',
    });
    try {
      const result = await scanReceipt(source);
      if (!result.success) {
        if (result.needsBackend && result.imageUri) {
          // OCR unavailable — push image to chat so user can see it
          pushMessage({ role: 'user', kind: 'image', uri: result.imageUri });
          pushMessage({
            role: 'assistant',
            content: result.error || 'OCR unavailable. I can see the image — please describe the transaction details (amount, merchant, date) and I will log it for you.',
          });
        } else {
          pushMessage({ role: 'assistant', content: result.error || 'Could not process receipt.' });
        }
        return;
      }
      if (result.imageUri) {
        pushMessage({ role: 'user', kind: 'image', uri: result.imageUri });
      }
      pushMessage({
        role: 'assistant',
        content: 'Receipt scanned. Here is what I extracted:',
        extractedTransaction: result.transaction,
        imageUri: result.imageUri,
      });
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch (e) {
      pushMessage({ role: 'assistant', content: `Scan failed: ${e.message || 'unknown error'}.` });
    } finally {
      setScanning(false);
    }
  }, [pushMessage]);

  const runPdfPicker = useCallback(async () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled) return;
      const file = res.assets?.[0];
      if (!file) return;
      pushMessage({
        role: 'user',
        kind: 'file',
        name: file.name,
        size: file.size,
        mime: file.mimeType,
      });
      pushMessage({
        role: 'assistant',
        content: `Got "${file.name}". PDF extraction runs on-device when the offline model is ready. Backend fallback coming in the next build.`,
      });
    } catch (e) {
      pushMessage({ role: 'assistant', content: `File pick failed: ${e.message}.` });
    }
  }, [pushMessage]);

  const runPdfConvert = useCallback(async (target) => {
    try {
      const asset = await pickPdf();
      if (!asset) return;
      pushMessage({ role: 'system', content: `Converting ${asset.name || 'PDF'} → ${target === 'word' ? 'Word (.rtf)' : 'Excel (.csv)'}…` });
      const res = target === 'word'
        ? await convertPdfToWord(asset)
        : await convertPdfToExcel(asset);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      const extra = res.rowCount != null ? ` · ${res.rowCount} rows` : '';
      pushMessage({ role: 'system', content: `Done — shared ${res.format.toUpperCase()}${extra}.` });
    } catch (e) {
      pushMessage({ role: 'assistant', content: `Conversion failed: ${e.message || e}` });
    }
  }, [pushMessage]);

  const doExport = useCallback(async (fmt) => {
    try {
      pushMessage({ role: 'system', content: `Preparing ${fmt.toUpperCase()} export…` });
      const res = await api.getTransactions();
      const txs = res?.transactions || res || [];
      if (!txs.length) {
        pushMessage({ role: 'assistant', content: 'No transactions in vault yet. Scan a receipt first.' });
        return;
      }
      if (fmt === 'csv') await exportCSV(txs);
      else if (fmt === 'peppol') await exportPeppolBatch(txs, { supplierName: 'My Company' });
      else await exportPDF(txs, { company: 'My Company' });
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      pushMessage({ role: 'system', content: `${fmt.toUpperCase()} ready — shared via iOS sheet.` });
    } catch (e) {
      pushMessage({ role: 'assistant', content: `Export failed: ${e.message || e}` });
    }
  }, [pushMessage]);

  const dedupGuard = useCallback(async (tx) => {
    try {
      const cap = await checkCap({ orgId, userId, tx });
      if (cap.warn) {
        const ok = await new Promise((resolve) => {
          Alert.alert(
            'Policy cap warning',
            `Saving this puts you at ${cap.afterThis.toFixed(0)} AED on ${cap.label} this month, over the ${cap.cap} AED cap (+${cap.overBy.toFixed(0)}). Continue?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Save over cap', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });
        if (!ok) return false;
      }
    } catch {}

    try {
      const dup = await checkDuplicate(tx, { orgId });
      if (dup.duplicate) {
        const m = dup.match || {};
        return new Promise((resolve) => {
          Alert.alert(
            'Possible duplicate',
            `${m.merchant || tx.merchant} · ${m.amount || tx.amount} AED on ${m.date || tx.date} was already submitted${m.submittedByName ? ` by ${m.submittedByName}` : ''}. Save anyway?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Save anyway', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });
      }
    } catch {}
    return true;
  }, [orgId, userId]);

  const runAnomalyCheck = useCallback(async (tx) => {
    try {
      const res = await api.getOrgTransactions?.(orgId, { submittedBy: userId })
        || await api.getTransactions({});
      const rows = Array.isArray(res) ? res : res?.transactions || [];
      const mine = rows.filter(r => !r.submittedBy || r.submittedBy === userId);
      const { anomaly, reasons, severity } = detectAnomaly(tx, mine);
      if (anomaly) {
        pushMessage({
          role: 'system',
          kind: 'anomaly',
          severity,
          content: `⚠ Anomaly: ${reasons.join(' · ')}`,
        });
      }
    } catch {}
  }, [orgId, userId, pushMessage]);

  const staple = useCallback(async (tx) => {
    const ok = await dedupGuard(tx);
    if (!ok) return;
    try {
      const enriched = withOrgContext(tx);
      await api.createTransaction(enriched);
      await recordSeen(tx, { submittedByName: submitterName });
      try {
        await seedVersion(enriched.id || tx.id, {
          ocrText: tx.ocrText || tx.rawText,
          imageUri: tx.imageUri,
          parsed: enriched,
          actorId: userId,
          actorName: submitterName,
        });
      } catch {}
      runAnomalyCheck(tx);
      pushMessage({
        role: 'system',
        content: `Saved: ${tx.merchant || 'transaction'} · ${tx.amount} AED · ${categoryById(tx.category).label} · by ${submitterName}`,
      });
      setMessages(prev => prev.map(m =>
        m.extractedTransaction?.id === tx.id ? { ...m, extractedSaved: true } : m
      ));
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch {
      Alert.alert('Error', 'Failed to save transaction');
    }
  }, [pushMessage, dedupGuard, submitterName]);

  const stapleFromQueue = useCallback(async (tx, msgId) => {
    const ok = await dedupGuard(tx);
    if (!ok) return;
    try {
      const enriched = withOrgContext(tx);
      await api.createTransaction(enriched);
      await recordSeen(tx, { submittedByName: submitterName });
      try {
        await seedVersion(enriched.id || tx.id, {
          ocrText: tx.ocrText || tx.rawText,
          imageUri: tx.imageUri,
          parsed: enriched,
          actorId: userId,
          actorName: submitterName,
        });
      } catch {}
      runAnomalyCheck(tx);
      pushMessage({ role: 'system', content: `Saved: ${tx.merchant || 'tx'} · ${tx.amount} AED · by ${submitterName}` });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, extractedSaved: true } : m));
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch { Alert.alert('Error', 'Failed to save'); }
  }, [pushMessage, dedupGuard, submitterName]);

  const runMergeScan = useCallback(async () => {
    setScanning(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    pushMessage({ role: 'system', content: 'Multi-page merge — pick 2-6 pages of one invoice.' });
    try {
      const r = await scanReceiptMerged();
      if (!r.success) {
        pushMessage({ role: 'assistant', content: r.error || 'Merge failed.' });
        return;
      }
      if (r.imageUri) pushMessage({ role: 'user', kind: 'image', uri: r.imageUri });
      pushMessage({
        role: 'assistant',
        content: `Merged ${r.transaction.pageCount} pages into one transaction:`,
        extractedTransaction: r.transaction,
        imageUri: r.imageUri,
      });
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch (e) {
      pushMessage({ role: 'assistant', content: `Merge failed: ${e.message}` });
    } finally {
      setScanning(false);
    }
  }, [pushMessage]);

  const runBulkScan = useCallback(async () => {
    setScanning(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    pushMessage({ role: 'system', content: 'Bulk scan started. Pick up to 20 receipts.' });
    try {
      const { results, count } = await scanReceiptBulk(({ done, total }) => {
        if (done > 0 && done < total) {
          // Live progress update (optional, currently noop)
        }
      });
      if (!count) {
        pushMessage({ role: 'assistant', content: 'No images selected.' });
        return;
      }
      const ok = results.filter(r => r.success);
      const failed = results.length - ok.length;
      pushMessage({
        role: 'assistant',
        content: `Processed ${count} receipt${count > 1 ? 's' : ''}. ${ok.length} extracted${failed ? `, ${failed} failed` : ''}. Review and save below.`,
      });
      for (const r of ok) {
        pushMessage({
          role: 'assistant',
          content: '',
          extractedTransaction: r.transaction,
          imageUri: r.imageUri,
        });
      }
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch (e) {
      pushMessage({ role: 'assistant', content: `Bulk scan failed: ${e.message}` });
    } finally {
      setScanning(false);
    }
  }, [pushMessage]);

  const clearMemory = useCallback(() => {
    newThread();
  }, [newThread]);

  const showWelcome = messages.length === 0;
  const memoryCount = messages.filter(m => m.role !== 'system').length;

  // Composer must hug the keyboard when it's up; otherwise sit above the floating tab bar.
  // Floating tab bar layout (App.js): bottom: 28 ios / 18 android, height: 72.
  const tabBarGap = Platform.OS === 'ios' ? 110 : 96;
  const composerBottomOffset = kbVisible ? 8 : tabBarGap;

  const userInitials = (() => {
    const src = (profile?.name || user?.email || '').trim();
    if (!src) return 'YO';
    const parts = src.split(/[\s@.]+/).filter(Boolean);
    const a = parts[0]?.[0] || '';
    const b = parts[1]?.[0] || '';
    return ((a + b) || src.slice(0, 2)).toUpperCase();
  })();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar style="dark" />

      <View style={[styles.topBar, { paddingTop: insets.top + 10, backgroundColor: '#FFFFFF' }]}>
        <Pressable onPress={() => setShowThreads(true)} hitSlop={10} style={styles.topIconBtn}>
          <Ionicons name="menu" size={22} color="#0B1435" />
        </Pressable>

        <Pressable
          onPress={() => setShowModelPicker(true)}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.topTitle, { color: '#0B1435' }]} numberOfLines={1}>
              {llmPref?.model ? (llmPref.model.length > 20 ? llmPref.model.slice(0, 18) + '…' : llmPref.model) : 'Select model'}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#0B1435" />
          </View>
        </Pressable>

        <Pressable onPress={clearMemory} hitSlop={10} style={styles.topIconBtn}>
          <Ionicons name="create-outline" size={22} color="#0B1435" />
        </Pressable>
      </View>

      <ErrorBoundary>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {showWelcome && (
          <Animated.View entering={FadeIn.duration(500)} style={styles.welcome}>
            <Text style={styles.welcomeHeadline}>
              How can I help{name && name !== 'there' ? `, ${name}` : ''}?
            </Text>

            <View style={styles.suggestRow}>
              {[
                'How much VAT can I reclaim?',
                'Summarize this month',
                'I paid 500 AED to Ravi',
              ].map((q) => (
                <Pressable
                  key={q}
                  onPress={() => send(q)}
                  style={styles.suggestChip}
                >
                  <Text style={styles.suggestText} numberOfLines={1}>{q}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}

        {messages.map((m, i) => {
          if (m.role === 'system') {
            return (
              <Animated.View key={m.id || i} entering={FadeIn.duration(220)} style={styles.systemRow}>
                <Text style={styles.systemText}>{m.content}</Text>
              </Animated.View>
            );
          }
          if (m.role === 'user') {
            if (m.kind === 'image') {
              return (
                <Animated.View key={m.id || i} entering={FadeInUp.duration(280)} layout={Layout.springify()} style={styles.userRow}>
                  <Image source={{ uri: m.uri }} style={styles.attachedImage} />
                </Animated.View>
              );
            }
            if (m.kind === 'file') {
              return (
                <Animated.View key={m.id || i} entering={FadeInUp.duration(280)} layout={Layout.springify()} style={styles.userRow}>
                  <View style={styles.fileCard}>
                    <View style={styles.fileIcon}>
                      <Ionicons name="document" size={16} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fileName} numberOfLines={1}>{m.name}</Text>
                      <Text style={styles.fileMeta}>
                        {m.mime || 'file'}{m.size ? ` · ${Math.round(m.size / 1024)} KB` : ''}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              );
            }
            return (
              <Animated.View key={m.id || i} entering={FadeInUp.duration(280)} layout={Layout.springify()} style={styles.userRow}>
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>{m.content}</Text>
                </View>
              </Animated.View>
            );
          }
          return (
            <Animated.View
              key={m.id || i}
              entering={FadeInUp.duration(320)}
              layout={Layout.springify()}
              style={styles.aiRow}
            >
              <Pressable
                onLongPress={() => showMessageActions(m)}
                delayLongPress={250}
                style={{ width: '100%' }}
              >
                {m.content ? (
                  <Markdown style={mdStyles}>{m.content}</Markdown>
                ) : null}
                {m.streaming && (
                  <View style={styles.streamBar}>
                    <View style={styles.streamDot} />
                    <Text style={styles.streamText}>streaming…</Text>
                    <Pressable onPress={stop} style={styles.stopBtn}>
                      <Ionicons name="stop" size={11} color="#FCA5A5" />
                      <Text style={styles.stopText}>Stop</Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>
              {!m.streaming && !m.extractedTransaction && m.role === 'assistant' && i === messages.length - 1 && (
                <Pressable onPress={regenerate} style={styles.regenBtn}>
                  <Ionicons name="refresh" size={12} color="#9CA3AF" />
                  <Text style={styles.regenText}>Regenerate</Text>
                </Pressable>
              )}
              {m.meta?.citations?.length > 0 && (
                <View style={styles.citationRow}>
                  {m.meta.citations.map((cite, ci) => (
                    <View key={ci} style={styles.citationChip}>
                      <Ionicons name="link" size={10} color="#9CA3AF" />
                      <Text style={styles.citationText} numberOfLines={1}>
                        [{ci + 1}] {cite.title}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {m.meta?.provider && m.meta.provider !== 'gemma' && (
                <Text style={styles.providerHint}>
                  {m.meta.webUsed ? '🌐 web · ' : ''}{m.meta.provider} · {m.meta.model}
                </Text>
              )}
              {m.extractedTransaction && !m.extractedSaved && (
                <TransactionEditor
                  transaction={m.extractedTransaction}
                  imageUri={m.imageUri}
                  submitterName={submitterName}
                  onSave={(tx) => stapleFromQueue(tx, m.id)}
                />
              )}
              {m.extractedTransaction && m.extractedSaved && (
                <View style={styles.savedChip}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.savedChipText}>Saved to Vault</Text>
                </View>
              )}
            </Animated.View>
          );
        })}

        {scanning && (
          <Animated.View entering={FadeIn.duration(160)} style={styles.aiRow}>
            <TypingDots />
          </Animated.View>
        )}
        {loading && !messages[messages.length - 1]?.streaming && (
          <Animated.View entering={FadeIn.duration(160)} style={styles.aiRow}>
            <TypingDots />
          </Animated.View>
        )}
      </ScrollView>
      </ErrorBoundary>

      <View style={styles.composer}>
        <ChatInputBox
          value={input}
          onChangeText={setInput}
          onSend={(msg, files) => send(msg)}
          onCamera={() => runScan('camera')}
          onPhotos={() => runScan('gallery')}
          onFileUpload={runPdfPicker}
          loading={loading}
          placeholder="Ask Filey AI anything…"
          bottomOffset={composerBottomOffset}
        />
      </View>

      {/* Left-edge swipe target — opens sidebar */}
      <GestureDetector gesture={edgeSwipe}>
        <View style={styles.edgeSwipeArea} pointerEvents="box-only" />
      </GestureDetector>

      <VatSummaryModal visible={showVatSummary} onClose={() => setShowVatSummary(false)} />

      <ClaudeSidebar
        open={showThreads}
        activeThreadId={activeThread?.id}
        onClose={() => setShowThreads(false)}
        onPickThread={switchThread}
        onNewChat={newThread}
        userName={profile?.name || user?.email?.split('@')[0] || 'You'}
        userInitials={userInitials}
        appName="Filey"
      />

      <Modal
        visible={showModelPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModelPicker(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-start', alignItems: 'center', paddingTop: insets.top + 56, paddingHorizontal: 24 }}
          onPress={() => setShowModelPicker(false)}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: '100%',
              maxWidth: 357,
              borderRadius: 26,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.18)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 18 },
              shadowOpacity: 0.28,
              shadowRadius: 32,
              elevation: 18,
            }}
          >
            <BlurView
              intensity={Platform.OS === 'ios' ? 70 : 40}
              tint="light"
              style={{ backgroundColor: 'rgba(255,255,255,0.55)' }}
            >
              <View style={{ paddingVertical: 8 }}>
                {(() => {
                  const seen = new Set();
                  const items = [];
                  // Always lead with the live preference, even if recents missed it.
                  if (llmPref?.provider && llmPref?.model) {
                    const k = `${llmPref.provider}::${llmPref.model}`;
                    seen.add(k);
                    items.push({ provider: llmPref.provider, model: llmPref.model, current: true });
                  }
                  for (const r of (recentModels || [])) {
                    const k = `${r?.provider}::${r?.model}`;
                    if (!r?.provider || !r?.model || seen.has(k)) continue;
                    seen.add(k);
                    items.push({ provider: r.provider, model: r.model, current: false });
                    if (items.length >= 3) break;
                  }
                  return items.map((it) => {
                    const tagline = modelTagline(it.model) || PROVIDERS[it.provider]?.label || '';
                    return (
                      <Pressable
                        key={`${it.provider}::${it.model}`}
                        onPress={async () => {
                          const next = { ...(llmPref || {}), provider: it.provider, model: it.model };
                          await setPreference(next);
                          setLlmPref(next);
                          const r = await getRecentModels(3);
                          setRecentModels(r);
                          try { Haptics.selectionAsync(); } catch {}
                          setShowModelPicker(false);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          gap: 12,
                          paddingHorizontal: 18,
                          paddingVertical: 14,
                        }}
                      >
                        <View style={{ width: 22, paddingTop: 2, alignItems: 'center' }}>
                          {it.current ? (
                            <Ionicons name="checkmark" size={20} color="#0B1435" />
                          ) : null}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: '#0B1435' }} numberOfLines={1}>
                            {it.model}
                          </Text>
                          {tagline ? (
                            <Text style={{ fontSize: 13, color: 'rgba(11,20,53,0.6)', marginTop: 2 }} numberOfLines={2}>
                              {tagline}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  });
                })()}
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(11,20,53,0.12)', marginVertical: 6, marginHorizontal: 18 }} />
                <Pressable
                  onPress={() => {
                    setShowModelPicker(false);
                    try {
                      navigation?.navigate?.('Settings', { open: 'ai' });
                    } catch {}
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 18,
                    paddingVertical: 14,
                  }}
                >
                  <View style={{ width: 22 }} />
                  <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: '#0B1435' }}>
                    Change provider
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="rgba(11,20,53,0.55)" />
                </Pressable>
              </View>
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const mdStyles = {
  body: { color: '#1F2937', fontSize: 15.5, lineHeight: 23 },
  strong: { color: '#0B1735', fontWeight: '700' },
  em: { color: '#1F2937', fontStyle: 'italic' },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { color: '#1F2937', fontSize: 15.5, lineHeight: 23 },
  code_inline: { backgroundColor: '#F3F4F6', color: '#1F2937', paddingHorizontal: 4, borderRadius: 4 },
  code_block: { backgroundColor: '#F3F4F6', color: '#1F2937', padding: 10, borderRadius: 10 },
  fence: { backgroundColor: '#F3F4F6', color: '#1F2937', padding: 10, borderRadius: 10 },
  heading1: { color: '#0B1735', fontSize: 20, fontWeight: '800' },
  heading2: { color: '#0B1735', fontSize: 17, fontWeight: '800' },
  heading3: { color: '#0B1735', fontSize: 15, fontWeight: '700' },
  link: { color: '#2563EB' },
  blockquote: { backgroundColor: '#F3F4F6', borderLeftWidth: 3, borderLeftColor: '#2A63E2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
};

const styles = StyleSheet.create({
  streamBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 8, paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.light.borderSubtle,
  },
  streamDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: Colors.positive,
  },
  streamText: { color: Colors.light.textMuted, fontSize: 11, fontWeight: '600', flex: 1 },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, backgroundColor: Colors.light.card,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  stopText: { color: Colors.light.text, fontSize: 11, fontWeight: '700' },
  regenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    marginTop: 6, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, backgroundColor: Colors.light.card,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  regenText: { color: Colors.light.textSecondary, fontSize: 11, fontWeight: '600' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11,20,53,0.06)',
  },
  topIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  topLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.light.primaryBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.light.borderAccent,
  },
  topTitle: { color: Colors.light.text, fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.positive },
  statusText: { color: Colors.light.textSecondary, fontSize: 11, fontWeight: '500' },
  clearBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.light.card,
    borderWidth: 1, borderColor: Colors.light.border,
  },

  welcome: {
    paddingTop: 60,
    paddingBottom: 24,
    gap: 28,
    alignItems: 'flex-start',
  },
  welcomeHeadline: {
    color: '#0B1435',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '500',
    letterSpacing: -0.6,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  suggestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  suggestChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(11,20,53,0.10)',
  },
  suggestText: {
    color: '#0B1435',
    fontSize: 13,
    fontWeight: '500',
  },

  systemRow: { alignItems: 'center', marginVertical: 10 },
  systemText: {
    color: Colors.light.textMuted,
    fontSize: 11.5, fontWeight: '600',
    backgroundColor: Colors.light.card,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10,
    letterSpacing: 0.3,
    borderWidth: 1, borderColor: Colors.light.borderSubtle,
  },

  userRow: { alignItems: 'flex-end', marginVertical: 6 },
  userBubble: {
    backgroundColor: '#2A63E2',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, borderBottomRightRadius: 6,
    maxWidth: '88%',
    borderWidth: 1, borderColor: 'rgba(59,107,255,0.35)',
  },
  userText: { color: '#FFFFFF', fontSize: 15, lineHeight: 21 },
  attachedImage: {
    width: 180, height: 240,
    borderRadius: 16, backgroundColor: Colors.light.card,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  fileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.light.card,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 14, maxWidth: '88%',
    borderWidth: 1, borderColor: Colors.light.border,
  },
  fileIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  fileName: { color: Colors.light.text, fontSize: 13.5, fontWeight: '600' },
  fileMeta: { color: Colors.light.textMuted, fontSize: 11, marginTop: 2 },

  aiRow: { alignItems: 'flex-start', marginVertical: 10, maxWidth: '100%' },
  aiText: { color: Colors.light.text, fontSize: 15.5, lineHeight: 23 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.light.text },

  txCard: {
    marginTop: 12,
    backgroundColor: Colors.light.card,
    borderWidth: 1, borderColor: Colors.light.border,
    borderRadius: 18, padding: 14,
    width: '100%',
  },
  txHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txIcon: {
    width: 22, height: 22, borderRadius: 7,
    backgroundColor: Colors.light.primaryBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.light.borderAccent,
  },
  txLabel: { color: Colors.primary, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2 },
  txMerchant: { color: Colors.light.text, fontSize: 18, fontWeight: '700', marginTop: 8, letterSpacing: -0.3 },
  txGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 10 },
  txCell: {
    flexBasis: '47%', flexGrow: 1,
    backgroundColor: Colors.light.cardElevated,
    padding: 10, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.light.borderSubtle,
  },
  txCellLabel: { color: Colors.light.textMuted, fontSize: 10.5, fontWeight: '600', letterSpacing: 0.5 },
  txCellValue: { color: Colors.light.text, fontSize: 14, fontWeight: '700', marginTop: 3 },
  saveBtn: {
    marginTop: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 42, borderRadius: 21,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '700' },
  citationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  citationChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 10, backgroundColor: Colors.light.card,
    borderWidth: 1, borderColor: Colors.light.border,
    maxWidth: 220,
  },
  citationText: { color: Colors.light.textSecondary, fontSize: 11, fontWeight: '600' },
  providerHint: { color: Colors.light.textMuted, fontSize: 10.5, marginTop: 6, fontStyle: 'italic' },
  savedChip: {
    marginTop: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.positiveLight,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.4)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  savedChipText: { color: Colors.positive, fontSize: 12, fontWeight: '700' },

  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(11,20,53,0.06)',
    paddingTop: 6,
    paddingBottom: 0,
    backgroundColor: '#FFFFFF',
  },
  edgeSwipeArea: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 22,
    zIndex: 50,
  },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, gap: 8,
  },
  attachBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.light.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.light.border,
  },
  input: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 15.5,
    backgroundColor: Colors.light.cardElevated,
    borderRadius: 20,
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10,
    maxHeight: 130, minHeight: 40,
    borderWidth: 1, borderColor: Colors.light.borderSubtle,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },

});
