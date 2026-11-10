import type { LegalPack } from "./types";

const en: LegalPack = {
  ui: {
    updated: "Last updated", operator: "Service provider", voen: "Tax ID (VÖEN)", address: "Address", contact: "Contact",
    onThisPage: "On this page", home: "Home",
    docs: { terms: "Terms of Service", privacy: "Privacy Policy", refund: "Payments & Refunds" },
    note: "Questions? Write to {email}.",
  },
  docs: {
    terms: {
      title: "Terms of Service",
      summary: "Rules for using {brand}: account, balance, content, liability and disputes.",
      sections: [
        { id: "umumi", h: "1. General", body: [
          "These terms govern the use of the {brand} platform (web panel, chat widget, Telegram and WhatsApp integrations, API) provided by {operator} (“we”).",
          "By registering or using the service you accept these terms, the Privacy Policy and the Payments & Refunds policy. If you do not agree, do not use the service.",
        ] },
        { id: "xidmet", h: "2. The service", body: [
          "{brand} is an AI assistant connected to a business's website, Telegram or WhatsApp. It answers visitors, searches listings and hands conversations over to an operator, based on the data the customer provides (listing and product sources, documents, website pages, company details).",
          "Features and prices are shown on the website and in the panel and may be updated from time to time.",
        ] },
        { id: "hesab", h: "3. Account and security", body: [
          "- You must be at least 18 years old. If you register on behalf of a business, you confirm you are authorised to do so.",
          "- You must provide accurate information and keep it up to date.",
          "- You are responsible for keeping your password and API key confidential. We recommend enabling two-step login.",
          "- You are responsible for all activity in your account, including your team members. Tell us immediately if you suspect unauthorised access.",
        ] },
        { id: "balans", h: "4. Balance and payment", body: [
          "The service runs on a prepaid balance (AZN). The actual cost of each answer is deducted from the balance; the current balance and spending history are shown in the panel.",
          "When the balance runs out, the assistant stops answering visitors and shows a contact form instead. The service resumes automatically after a top-up.",
          "We announce price changes at least 14 days in advance by email or in the panel. Balance already topped up is used at the new prices after the change.",
          "Each top-up can be used for 12 months from the top-up date; any part not used in that time expires. Topped-up balance is non-refundable and cannot be cashed out (except for incorrect charges and if we discontinue the service). Details: the “Payments & Refunds” document.",
        ] },
        { id: "mezmun", h: "5. Your content and obligations", body: [
          "- Data you upload or connect (listings, documents, API responses, company details) belongs to you. You confirm you have the right to use it.",
          "- You are responsible for the assistant's content (greeting, canned replies, operator replies) and for the accuracy of information you give visitors.",
          "- You are the controller of your visitors' data; we process it on your behalf. Your website's privacy notice should mention that you use a chat assistant.",
          "- You grant us a limited, revocable licence to store, process and pass your data to AI providers solely to provide the service.",
        ] },
        { id: "qadagan", h: "6. Prohibited use", body: [
          "- distributing unlawful, misleading, abusive or violent content, or content that infringes others' rights;",
          "- spam, fraud or impersonation;",
          "- connecting to a website, bot or number you do not own or are not authorised to use;",
          "- connecting the same website with multiple accounts to obtain trial balance or bonuses, or otherwise bypassing limits;",
          "- interfering with the service, exploiting vulnerabilities, reverse engineering or automated attacks.",
          "In these cases we may suspend the account or block the domain without notice.",
        ] },
        { id: "ai", h: "7. AI-generated answers", body: [
          "Answers are generated automatically and may be wrong, incomplete or outdated. The assistant does not give legal, medical or financial advice.",
          "We recommend testing the assistant in the test chat before going live and keeping key information (prices, terms) up to date in your sources. We are not liable for decisions made based on the assistant's answers.",
        ] },
        { id: "elcatanliq", h: "8. Availability", body: [
          "We aim to keep the service available, but maintenance, failures and third-party dependencies (AI providers, Telegram, WhatsApp, hosting) may cause interruptions. The service is provided “as is”.",
          "Where possible we announce planned maintenance in advance.",
        ] },
        { id: "dayandirma", h: "9. Suspension and account deletion", body: [
          "You can delete your account at any time in the panel (Settings → Account → Delete account). Your data is then deleted as described in the Privacy Policy. Unused balance is not refunded when an account is deleted.",
          "We may suspend an account for breach of these terms, payment fraud or legal requirements. Data and balance of a suspended account are not deleted immediately, and the reason is sent by email.",
        ] },
        { id: "mesuliyyet", h: "10. Limitation of liability", body: [
          "To the extent permitted by law, we are not liable for indirect damages, lost profits or data loss.",
          "Our total liability for any claim is limited to the amount you paid us in the 3 months before the claim.",
        ] },
        { id: "mulkiyyet", h: "11. Intellectual property", body: [
          "The platform, its design, code and the {brand} name belong to us. These terms only grant you the right to use the service.",
          "The widget may show “Powered by {brand}”. Removing it requires a separate agreement.",
        ] },
        { id: "deyisiklik", h: "12. Changes to these terms", body: [
          "We may update these terms. We announce significant changes at least 14 days before they take effect by email or in the panel. Continued use after the change means acceptance.",
        ] },
        { id: "huquq", h: "13. Governing law", body: [
          "These terms are governed by the laws of the Republic of Azerbaijan. Disputes are first resolved by negotiation and, failing that, by the courts of the Republic of Azerbaijan.",
        ] },
        { id: "elaqe", h: "14. Contact", body: ["For questions about these terms, write to {email}."] },
      ],
    },
    privacy: {
      title: "Privacy Policy",
      summary: "What data we collect, why we use it, who we share it with and how long we keep it.",
      sections: [
        { id: "kim", h: "1. Who we are and our role", body: [
          "{operator} operates the {brand} platform. We are the controller of account holders' (businesses') data.",
          "For visitors who chat with the assistant on a business's website, Telegram or WhatsApp, the business is the controller; we process that data on its behalf and on its instructions.",
          "We process personal data in accordance with the Law of the Republic of Azerbaijan “On Personal Data”.",
        ] },
        { id: "melumat", h: "2. Data we collect", body: [
          "- **Account:** email, password hash (the password itself is not stored), two-step login settings, language.",
          "- **Business:** business name, website domain, company contact details (phone, address, opening hours), assistant settings.",
          "- **Payments:** top-up amount, date and status. Card details are processed by the payment provider and are not stored by us.",
          "- **Knowledge base and catalog:** uploaded documents, texts, crawled website pages, listing source address and responses. API keys are stored encrypted.",
          "- **Visitor conversations:** messages, an anonymous visitor ID stored in the browser, the page where the chat started, and any name, phone or email the visitor chooses to provide.",
          "- **Channels:** Telegram and WhatsApp user ID, name and number (if the channel is connected).",
          "- **Technical:** IP address, browser data, access and error logs, domains connected to accounts (to prevent abuse).",
        ] },
        { id: "meqsed", h: "3. Why we use data", body: [
          "- to provide the service: answers, search, operator chat, notifications;",
          "- to secure accounts, verify logins and prevent abuse (e.g. connecting one website with multiple accounts);",
          "- to calculate balance, record payments and meet accounting obligations;",
          "- for support and important service notices;",
          "- to improve the service using aggregated, non-identifying statistics.",
          "We do not sell or share data for advertising. We do not use customer data to train our own models.",
        ] },
        { id: "esas", h: "4. Legal bases", body: [
          "We process data to perform our contract (providing the service), for legitimate interests (security, abuse prevention), to meet legal obligations (accounting) and, where required, with consent.",
        ] },
        { id: "paylasma", h: "5. Who we share data with", body: [
          "We use the following providers to deliver the service. They process data only on our instructions and under contract:",
          "- **AI providers** (Anthropic — Claude, Google — Gemini): the visitor's question and the context needed to answer;",
          "- **Email delivery** (Resend): code and notification emails;",
          "- **Cloud hosting and database providers**;",
          "- **Payment provider**: balance top-ups;",
          "- **Telegram and WhatsApp**: only if you connect these channels.",
          "Some providers are located outside Azerbaijan (USA, EU), so data may be transferred abroad. Such transfers are necessary to provide the service and are made with appropriate safeguards.",
          "We disclose data to authorities only when required by law.",
        ] },
        { id: "saxlama", h: "6. How long we keep data", body: [
          "- live operator chats: 60 days;",
          "- assistant query log and answer feedback: 90 days;",
          "- Telegram and WhatsApp chat sessions: 14 days after inactivity;",
          "- error logs: 30 days; security and admin action log: 1 year;",
          "- verification codes: 15 minutes;",
          "- account, knowledge base and leads: until you delete them or the account is deleted;",
          "- payment records: for the period required by law.",
        ] },
        { id: "tehlukesizlik", h: "7. Security", body: [
          "All connections use HTTPS, passwords are hashed, API keys and channel tokens are stored encrypted. We provide two-step login, session control and an admin action log. No system is completely secure, but we continuously work to reduce risk.",
        ] },
        { id: "huquqlar", h: "8. Your rights", body: [
          "You have the right to access, correct, delete and obtain a copy of your data and to object to its processing. You can delete your account and data in the panel and export leads and chats as CSV. For other requests write to {email}; we reply within 30 days.",
          "Visitors should first contact the business they chatted with about their data. We help the business fulfil such requests.",
        ] },
        { id: "kuki", h: "9. Cookies and browser storage", body: [
          "- **ca_session:** keeps you signed in to the panel (essential);",
          "- **lang:** your chosen language;",
          "- **ref_code:** partner code if you arrived via a partner link (90 days);",
          "- **chat widget:** an anonymous ID and chat state are stored in the visitor's browser so the chat survives page changes.",
          "We do not use advertising or tracking cookies.",
        ] },
        { id: "usaqlar", h: "10. Children", body: ["The platform is not intended for people under 18 and we do not knowingly collect their data."] },
        { id: "deyisiklik", h: "11. Changes", body: ["We may update this policy. We announce significant changes in advance by email or in the panel."] },
        { id: "elaqe", h: "12. Contact", body: ["For privacy requests, write to {email}."] },
      ],
    },
    refund: {
      title: "Payments & Refunds",
      summary: "How the balance works, how long it can be used and the refund rules.",
      sections: [
        { id: "model", h: "1. How the balance works", body: [
          "{brand} runs on a prepaid balance. You top up, and the actual cost of each answer is deducted. There are no auto-renewing subscriptions or hidden charges.",
          "Spending history, current balance and top-ups are shown in the “Balance” section of the panel. A daily spending limit protects against unexpected spikes (e.g. bot attacks).",
          "Each top-up can be used for **12 months from the top-up date**. Any part not used within that period expires and cannot be restored. Usage is deducted from the top-up that expires soonest. The remaining amount and expiry date of each top-up are shown in the panel, with a notice when one is about to expire.",
        ] },
        { id: "odenis", h: "2. Payment", body: [
          "Payments are accepted in Azerbaijani manat (AZN) by bank card through a licensed payment provider. We never see or store card details.",
          "After a successful payment the balance increases automatically and a confirmation email is sent.",
        ] },
        { id: "qaytarma", h: "3. Refunds", body: [
          "Topped-up balance is **non-refundable and cannot be cashed out**, neither after the top-up nor when you close your account. Choose the amount you need; you can start small and top up as you go.",
          "We refund money only in these cases:",
          "- **Incorrect charges:** if a technical error deducted too much or a payment went through twice, the excess is refunded in full.",
          "- **If we discontinue the service:** if the platform stops operating, the unused topped-up balance is refunded.",
          "- other cases required by law.",
        ] },
        { id: "qaytarilmir", h: "4. When we don't refund", body: [
          "- costs already used (answers given by the assistant);",
          "- balance that has expired (after 12 months);",
          "- balance remaining when an account is closed or deleted;",
          "- free balance and any balance granted as a bonus, promotion or through the partner programme (these cannot be cashed out);",
          "- accounts suspended for breach of the terms.",
        ] },
        { id: "nece", h: "5. How to report an incorrect charge", body: [
          "Write to {email} with your account email, payment date and amount. We review requests within 10 business days.",
          "Approved amounts are returned to the card used for payment. Depending on the bank this can take 5–15 business days.",
        ] },
        { id: "mubahise", h: "6. Payment disputes", body: [
          "If there is a problem with a payment, please contact us before opening a chargeback with your bank — we resolve most cases within a few days. The account may be temporarily restricted while a dispute is open.",
        ] },
        { id: "qiymet", h: "7. Price changes", body: [
          "We announce price changes at least 14 days in advance by email or in the panel. You can choose not to top up during that time; balance already topped up is used at the new prices after the change.",
        ] },
      ],
    },
  },
};
export default en;
