# Soegih - Brainstorming Document

DATE: Friday, 13 March 2026

## Question 1: What am I actually trying to do? (What is the goal of this project?)

Build a personal finance management web app for tracking all of my expenses, income, budgets usage, savings goals, investments, and subscriptions so that I can be mindful & prepared with my money and I will be able to track my net worth over the time. I also want to add AI feature to provide the users new experience in managing their money.

## Question 2: What are the milestones of functionalities I want?

### MVP

1. Single user (only me)
2. User can manage his wallets -> only for storing some amount of money, not integrated with any 3rd party such as bank accounts, digital wallets, etc.
3. User can manage their expense & income categories.
4. User can track their expenses & income.
5. User can move (transfer) money between wallets.
6. User can use AI for tracking their expenses/income by writing it in a plain text naturally in English.
7. User can see a simple dashboard displaying the total expense & income in the current month, the total net worth over time (total amount of money in all wallets), a simple pie chart displaying the expense distribution (based on the category).

### UI Design Preferences (applies to MVP and beyond)

- **Desktop-first** layout, fully responsive down to tablet and mobile.
- **Desktop view**: wallets, categories, and transactions are displayed as data tables with column header click-to-sort, search, and pagination.
  - Wallets & categories: client-side sorting, filtering, and pagination (all data returned in one API response).
  - Transactions: server-side sorting, searching, and pagination (query params sent to backend on each interaction).
- **Mobile view**: list items displayed as cards following modern mobile design conventions. Same client-side vs. server-side data handling rules as desktop.

### V1

1. User can define budgets for some or all their expense categories.
2. User can see the budgets usage in the current month.
3. User can see new information on the dashboard: the total remaining budgets available to use in the current month.

### V2

To be defined later.

### Later

To be defined later.

### Not in scope

Integration with 3rd party payment system (banks, digital wallets, digital investment platforms, etc)
