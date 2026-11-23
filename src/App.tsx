import { lazy, Suspense } from "react";
import { createBrowserRouter, redirect, RouterProvider } from "react-router-dom";
import HomePage from "./pages/HomePage/HomePage";
import AppLayout from "./components/AppLayout/AppLayout";
import AccountPage from "./pages/AccountPage/AccountPage";
import LoginForm from "./components/Account/LoginForm/LoginForm";
import RegisterForm from "./components/Account/RegisterForm/RegisterForm";
import PersonalAccount from "./components/Account/PersonalAccount/PersonalAccount";
import TasksPage from "./components/Tasks/TasksPage";
import CustomModal from "./components/UI/CustomModal";
import PurchasePlanList from "./components/PurchasePlan/PurchasePlanList";
import PurchasePlanCard from "./components/PurchasePlan/PurchasePlanCard";
import PurchasePlanForm from "./components/PurchasePlan/PurchasePlanForm";
import PurchasePlanPositionEditPage from "./components/PurchasePlan/PurchasePlanPositionEditPage";
import PurchaseNotePage from "./components/PurchaseNote/PurchaseNotePage";
import PurchaseNotesRegistryPage from "./components/PurchaseNote/PurchaseNotesRegistryPage";
import ProcurementProcessing from "./components/ProcurementProcessing/ProcurementProcessing";
import NoticeInfoForm from "./components/NoticeInfoForm/NoticeInfoForm";
import ContractServicePage from "./components/ContractService/ContractServicePage";
import ContractProjectForm from "./components/ContractProject/ContractProjectForm";
import ContractProjectsPage from "./components/ContractProject/ContractProjectsPage";
import SmnpSonekPage from "./components/Reports/SmnpSonekPage";
import Order158nReportsPage from "./components/Reports/Order158nReportsPage";
import ContractRegistryPage from "./components/ContractRegistry/ContractRegistryPage";
import ContractCardPage from "./components/ContractRegistry/ContractCardPage";
import ContractChangeRegistryPage from "./components/ContractChange/ContractChangeRegistryPage";
import ContractChangeFormPage from "./components/ContractChange/ContractChangeFormPage";
import ContractChangeDetailPage from "./components/ContractChange/ContractChangeDetailPage";
import AcceptanceRegistryPage from "./components/ContractAcceptance/AcceptanceRegistryPage";
import AcceptanceFormPage from "./components/ContractAcceptance/AcceptanceFormPage";
import AcceptanceDetailPage from "./components/ContractAcceptance/AcceptanceDetailPage";
import Okpd2Dictionary from "./components/Okpd2Ref/Okpd2Dictionary";
import LegalActsRegistry from "./components/LegalAct/LegalActsRegistry";
import LiabilityMappingPage from "./components/LiabilityMapping/LiabilityMappingPage";
import TaskDetailPage from "./components/Tasks/TaskDetailPage";
import EisSmpExportPage from "./components/Eis/EisSmpExportPage";
import EisPackagesPage from "./components/Eis/EisPackagesPage";
import EisSchemaExplorerPage from "./components/Eis/EisSchemaExplorerPage";
import EisChainPage from "./components/Eis/EisChainPage";
import NormingRequirementsPage from "./components/NormingRequirements/NormingRequirementsPage";
import EdsJournalPage from "./components/Eds/EdsJournalPage";
import NmckCalculatorPage from "./components/Nmck/NmckCalculatorPage";
import DefectListsPage from "./components/DefectList/DefectListsPage";
import EstimatesPage from "./components/Estimate/EstimatesPage";
import EstimateEditorPage from "./components/Estimate/EstimateEditorPage";
import BidEvaluationsPage from "./components/BidEvaluation/BidEvaluationsPage";
import VacationSchedulePage from "./components/VacationSchedule/VacationSchedulePage";
import DeadlineNotificationsPage from "./components/Notifications/DeadlineNotificationsPage";
import ProcurementDocumentsPage from "./components/ProcurementDocuments/ProcurementDocumentsPage";
import UiSolutionsPage from "./components/UiSolutions/UiSolutionsPage";

// Аналитика тянет Recharts и D3 — самый тяжёлый код интерфейса. Отдельный
// ленивый чанк держит главную лёгкой: графики загружаются только при переходе
// на /analytics.
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage/AnalyticsPage"));

// Визитка — самостоятельная одностраничная посадочная без шапки приложения.
// Ленивый маршрут: на рабочий стол её CSS и разметка не влияют.
const VisitCardPage = lazy(() => import("./pages/VisitCardPage/VisitCardPage"));

// Кабинет подрядчика — внешний контур: вход по ИНН, реестр контрактов по
// заказчикам и направление сведений о привлечении СМП. Ленивые маршруты,
// потому что подрядчик не открывает рабочий стол контрактной службы.
const ContractorLoginPage = lazy(
  () => import("./components/Contractor/ContractorLoginPage"),
);
const ContractorDashboardPage = lazy(
  () => import("./components/Contractor/ContractorDashboardPage"),
);

const lazySection = (node: React.ReactNode) => (
  <Suspense
    fallback={
      <div
        style={{
          padding: "48px 16px",
          color: "var(--text-secondary)",
          textAlign: "center",
        }}
      >
        Загрузка…
      </div>
    }
  >
    {node}
  </Suspense>
);

// Визитка открывается первой только в новой вкладке: после входа на сайт
// корень снова ведёт на рабочий стол, а не обратно на визитку.
const VISIT_CARD_SEEN_KEY = "csms.visitCardSeen";

const visitCardSeen = () => {
  try {
    return sessionStorage.getItem(VISIT_CARD_SEEN_KEY) === "1";
  } catch {
    return false;
  }
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        path: "/",
        element: <HomePage />,
        loader: () =>
          visitCardSeen() ? null : redirect("/visit-card"),
      },
      {
        // Тяжёлые графики вынесены с главной: маршрут подгружается по требованию
        path: "/analytics",
        element: (
          <Suspense
            fallback={
              <div
                style={{
                  padding: "48px 16px",
                  color: "var(--text-secondary)",
                  textAlign: "center",
                }}
              >
                Загрузка аналитики…
              </div>
            }
          >
            <AnalyticsPage />
          </Suspense>
        ),
      },
      {
        path: "/account",
        element: <AccountPage />,
        children: [
          { path: "login", element: <CustomModal children={<LoginForm />} /> },
          {
            path: "register",
            element: <CustomModal children={<RegisterForm />} />,
          },
          { path: "profile", element: <PersonalAccount /> },
        ],
      },
      {
        path: "/tasks",
        element: <TasksPage />,
      },
      {
        path: "/tasks/:id",
        element: <TaskDetailPage />,
      },
      {
        path: "/purchase-plans",
        children: [
          { index: true, element: <PurchasePlanList /> },
          { path: "new", element: <PurchasePlanForm /> },
          { path: ":id", element: <PurchasePlanCard /> },
          { path: ":id/edit", element: <PurchasePlanForm /> },
          {
            path: ":id/positions/new",
            element: <PurchasePlanPositionEditPage />,
          },
          {
            path: ":id/positions/:positionId/edit",
            element: <PurchasePlanPositionEditPage />,
          },
          {
            path: ":id/positions/:positionId/requirement",
            element: <PurchaseNotePage />,
          },
        ],
      },
      {
        path: "/purchase-notes",
        element: <PurchaseNotesRegistryPage />,
      },
      {
        path: "/contract-service",
        element: <ContractServicePage />,
      },
      {
        path: "/procurement-processing",
        children: [
          { index: true, element: <ProcurementProcessing /> },
          {
            path: ":id/notice-info",
            element: <NoticeInfoForm />,
          },
          {
            path: ":id/contract-project",
            element: <ContractProjectForm />,
          },
        ],
      },
      {
        // Реестр проектов контрактов — точка входа в конструктор из шапки
        path: "/contract-projects",
        element: <ContractProjectsPage />,
      },
      {
        path: "/reports/smnp",
        element: <SmnpSonekPage />,
      },
      {
        // Автоматическая отчётность по Приказу Минфина России № 158н
        path: "/reports/order-158n",
        element: <Order158nReportsPage />,
      },
      {
        path: "/contract-registry",
        element: <ContractRegistryPage />,
      },
      {
        // Карточка контракта: реестр показывает только сводку с прогрессбарами,
        // детали (этапы, платежи, приёмки, поставки, СМП) — на этом роуте
        path: "/contract-registry/:id",
        element: <ContractCardPage />,
      },
      {
        // Личный кабинет подрядчика: вход по ИНН поставщика (Tasks 9 п. 6 —
        // «подрядчик сам загружает сведения и направляет их заказчику»)
        path: "/contractor",
        element: lazySection(<ContractorLoginPage />),
      },
      {
        // Реестр контрактов подрядчика по заказчикам + направление СМП
        path: "/contractor/registry",
        element: lazySection(<ContractorDashboardPage />),
      },
      {
        // Изменение и расторжение контрактов по ст. 95 44-ФЗ: реестр,
        // форма со снимком контракта и карточка с согласованием и ЕИС
        path: "/contract-changes",
        children: [
          { index: true, element: <ContractChangeRegistryPage /> },
          { path: "new", element: <ContractChangeFormPage /> },
          { path: ":id", element: <ContractChangeDetailPage /> },
          { path: ":id/edit", element: <ContractChangeFormPage /> },
        ],
      },
      {
        // Электронное актирование по ст. 94 44-ФЗ: приёмка, расхождения,
        // мотивированный отказ и регистрация документа в ЕИС
        path: "/acceptances",
        children: [
          { index: true, element: <AcceptanceRegistryPage /> },
          { path: "new", element: <AcceptanceFormPage /> },
          { path: ":id", element: <AcceptanceDetailPage /> },
          { path: ":id/edit", element: <AcceptanceFormPage /> },
        ],
      },
      {
        path: "/eis/smp-export",
        element: <EisSmpExportPage />,
      },
      {
        // Исходящие пакеты в ЕИС: подпись, статусы и ошибки ФЛК
        path: "/eis/packages",
        element: <EisPackagesPage />,
      },
      {
        // Обозреватель XSD Альбома ЕИС: версии, пространства имён, типы и поля
        path: "/eis/schemas",
        element: <EisSchemaExplorerPage />,
      },
      {
        // Сквозная цепочка: план-график → СЗ → извещение → контракт → СМП
        path: "/eis/chains",
        element: <EisChainPage />,
      },
      {
        // Справочник ОКПД2: поиск по коду/наименованию, признак нормирования
        path: "/okpd2",
        element: <Okpd2Dictionary />,
      },
      {
        // Типовые требования по п. 7 ПП РФ N 926 для нормируемых кодов ОКПД2
        path: "/norming-requirements",
        element: <NormingRequirementsPage />,
      },
      {
        // Реестр законодательных актов и связей норм с компонентами системы
        path: "/legal-acts",
        element: <LegalActsRegistry />,
      },
      {
        // Compliance & Liability Mapping: обязанности 158н → нормы КоАП
        path: "/liability-mapping",
        element: <LiabilityMappingPage />,
      },
      {
        // Журнал действий с ЭП заказчика: кто, когда, каким сертификатом подписал
        path: "/eds/journal",
        element: <EdsJournalPage />,
      },
      {
        // Модуль расчёта НМЦК методом сопоставимых рыночных цен (анализ рынка)
        path: "/nmck-calculator",
        element: <NmckCalculatorPage />,
      },
      {
        // Дефектовки: роль «инициатор закупки» — объёмы работ, проект сметы
        // контракта (421/пр) и проект календарного графика (336/пр)
        path: "/defect-lists",
        element: <DefectListsPage />,
      },
      {
        // Отдельный модуль «смета + обоснование НМЦК»: вход — дефектовка,
        // выход — утверждённый документ, доступный из дефектовки
        path: "/estimates",
        element: <EstimatesPage />,
      },
      {
        path: "/estimates/:id",
        element: <EstimateEditorPage />,
      },
      {
        // Оценка заявок: критерии, значимость и баллы по ПП РФ N 2604
        path: "/bid-evaluations",
        element: <BidEvaluationsPage />,
      },
      {
        // График отпусков (форма Т-2): планирование, проверки ТК РФ, выгрузки
        path: "/vacation-schedule",
        element: <VacationSchedulePage />,
      },
      {
        // Система уведомлений о приближении сроков исполнения контрактов и этапов 44-ФЗ
        path: "/notifications",
        element: <DeadlineNotificationsPage />,
      },
      {
        // Генерация типовых форм документов по карточкам закупок и Document Checker по реестру НПА
        path: "/documents",
        element: <ProcurementDocumentsPage />,
      },
      {
        // Полный структурированный перечень UI-решений: назначение, место применения и реализация
        path: "/ui-solutions",
        element: <UiSolutionsPage />,
      },
    ],
  },
  {
    // Одностраничная визитка проекта: вне AppLayout, со своей тёмной палитрой.
    // Отметка выставляется при открытии, чтобы кнопки «Войти в систему»
    // вернули на сайт, а не зациклились на той же визитке.
    path: "/visit-card",
    loader: () => {
      try {
        sessionStorage.setItem(VISIT_CARD_SEEN_KEY, "1");
      } catch {
        // Приватный режим с запретом хранилища: визитка просто не зациклится,
        // если пользователь перейдёт на сайт через прямой адрес.
      }
      return null;
    },
    element: (
      <Suspense
        fallback={
          <div
            style={{
              display: "grid",
              placeItems: "center",
              minHeight: "100dvh",
              background: "#060b12",
              color: "#9fb2c5",
              fontFamily: "Poppins, Arial, sans-serif",
            }}
          >
            Загрузка визитки…
          </div>
        }
      >
        <VisitCardPage />
      </Suspense>
    ),
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
