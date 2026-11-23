import { lazy, Suspense } from "react";
import { createBrowserRouter, redirect, RouterProvider } from "react-router-dom";
import { ACCESS_TOKEN_KEY } from "./services/Access/access.api";
import HomePage from "./pages/HomePage/HomePage";
import AppLayout from "./components/AppLayout/AppLayout";
import AccountPage from "./pages/AccountPage/AccountPage";
import LoginForm from "./components/Account/LoginForm/LoginForm";
import RegisterForm from "./components/Account/RegisterForm/RegisterForm";
import PersonalAccount from "./components/Account/PersonalAccount/PersonalAccount";
import TasksPage from "./components/Tasks/TasksPage";
import CustomModal from "./components/UI/CustomModal";
import PurchasePlanList from "./components/PurchasePlan/PurchasePlanList";
import ProcurementProcessing from "./components/ProcurementProcessing/ProcurementProcessing";
import ContractProjectsPage from "./components/ContractProject/ContractProjectsPage";
import ContractRegistryPage from "./components/ContractRegistry/ContractRegistryPage";

// Редкие и тяжёлые экраны грузятся по требованию: стартовый бандл держит только
// рабочий стол, первые формы и реестр. Аналитика и визитка уже были ленивыми.
const TaskDetailPage = lazy(() => import("./components/Tasks/TaskDetailPage"));
const PurchasePlanCard = lazy(
  () => import("./components/PurchasePlan/PurchasePlanCard"),
);
const PurchasePlanForm = lazy(
  () => import("./components/PurchasePlan/PurchasePlanForm"),
);
const PurchasePlanPositionEditPage = lazy(
  () => import("./components/PurchasePlan/PurchasePlanPositionEditPage"),
);
const PurchaseNotePage = lazy(
  () => import("./components/PurchaseNote/PurchaseNotePage"),
);
const PurchaseNotesRegistryPage = lazy(
  () => import("./components/PurchaseNote/PurchaseNotesRegistryPage"),
);
const NoticeInfoForm = lazy(
  () => import("./components/NoticeInfoForm/NoticeInfoForm"),
);
const ContractProjectForm = lazy(
  () => import("./components/ContractProject/ContractProjectForm"),
);
const ContractServicePage = lazy(
  () => import("./components/ContractService/ContractServicePage"),
);
const SmnpSonekPage = lazy(() => import("./components/Reports/SmnpSonekPage"));
const Order158nReportsPage = lazy(
  () => import("./components/Reports/Order158nReportsPage"),
);
const ContractCardPage = lazy(
  () => import("./components/ContractRegistry/ContractCardPage"),
);
const ContractChangeRegistryPage = lazy(
  () => import("./components/ContractChange/ContractChangeRegistryPage"),
);
const ContractChangeFormPage = lazy(
  () => import("./components/ContractChange/ContractChangeFormPage"),
);
const ContractChangeDetailPage = lazy(
  () => import("./components/ContractChange/ContractChangeDetailPage"),
);
const AcceptanceRegistryPage = lazy(
  () => import("./components/ContractAcceptance/AcceptanceRegistryPage"),
);
const AcceptanceFormPage = lazy(
  () => import("./components/ContractAcceptance/AcceptanceFormPage"),
);
const AcceptanceDetailPage = lazy(
  () => import("./components/ContractAcceptance/AcceptanceDetailPage"),
);
const Okpd2Dictionary = lazy(
  () => import("./components/Okpd2Ref/Okpd2Dictionary"),
);
const LegalActsRegistry = lazy(
  () => import("./components/LegalAct/LegalActsRegistry"),
);
const LiabilityMappingPage = lazy(
  () => import("./components/LiabilityMapping/LiabilityMappingPage"),
);
const EisSmpExportPage = lazy(() => import("./components/Eis/EisSmpExportPage"));
const EisPackagesPage = lazy(() => import("./components/Eis/EisPackagesPage"));
const EisSchemaExplorerPage = lazy(
  () => import("./components/Eis/EisSchemaExplorerPage"),
);
const EisChainPage = lazy(() => import("./components/Eis/EisChainPage"));
const EisTestAccessPage = lazy(() => import("./components/Eis/EisTestAccessPage"));
const BrandPage = lazy(() => import("./components/Brand/BrandPage"));
const NormingRequirementsPage = lazy(
  () => import("./components/NormingRequirements/NormingRequirementsPage"),
);
const EdsJournalPage = lazy(() => import("./components/Eds/EdsJournalPage"));
const NmckCalculatorPage = lazy(
  () => import("./components/Nmck/NmckCalculatorPage"),
);
const DefectListsPage = lazy(
  () => import("./components/DefectList/DefectListsPage"),
);
const EstimatesPage = lazy(() => import("./components/Estimate/EstimatesPage"));
const EstimateEditorPage = lazy(
  () => import("./components/Estimate/EstimateEditorPage"),
);
const BidEvaluationsPage = lazy(
  () => import("./components/BidEvaluation/BidEvaluationsPage"),
);
const VacationSchedulePage = lazy(
  () => import("./components/VacationSchedule/VacationSchedulePage"),
);
const DeadlineNotificationsPage = lazy(
  () => import("./components/Notifications/DeadlineNotificationsPage"),
);
const ProcurementDocumentsPage = lazy(
  () => import("./components/ProcurementDocuments/ProcurementDocumentsPage"),
);
const UiSolutionsPage = lazy(
  () => import("./components/UiSolutions/UiSolutionsPage"),
);

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

// Визитка открывается первой только в новой вкладке и только до входа:
// авторизованного пользователя корень ведёт сразу на рабочий стол.
const VISIT_CARD_SEEN_KEY = "csms.visitCardSeen";

const visitCardSeen = () => {
  try {
    if (localStorage.getItem(ACCESS_TOKEN_KEY)) return true;
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
          {
            path: "login",
            element: (
              <CustomModal>
                <LoginForm />
              </CustomModal>
            ),
          },
          {
            path: "register",
            element: (
              <CustomModal>
                <RegisterForm />
              </CustomModal>
            ),
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
        element: lazySection(<TaskDetailPage />),
      },
      {
        path: "/purchase-plans",
        children: [
          { index: true, element: <PurchasePlanList /> },
          { path: "new", element: lazySection(<PurchasePlanForm />) },
          { path: ":id", element: lazySection(<PurchasePlanCard />) },
          { path: ":id/edit", element: lazySection(<PurchasePlanForm />) },
          {
            path: ":id/positions/new",
            element: lazySection(<PurchasePlanPositionEditPage />),
          },
          {
            path: ":id/positions/:positionId/edit",
            element: lazySection(<PurchasePlanPositionEditPage />),
          },
          {
            path: ":id/positions/:positionId/requirement",
            element: lazySection(<PurchaseNotePage />),
          },
        ],
      },
      {
        path: "/purchase-notes",
        element: lazySection(<PurchaseNotesRegistryPage />),
      },
      {
        path: "/contract-service",
        element: lazySection(<ContractServicePage />),
      },
      {
        path: "/procurement-processing",
        children: [
          { index: true, element: <ProcurementProcessing /> },
          {
            path: ":id/notice-info",
            element: lazySection(<NoticeInfoForm />),
          },
          {
            path: ":id/contract-project",
            element: lazySection(<ContractProjectForm />),
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
        element: lazySection(<SmnpSonekPage />),
      },
      {
        // Автоматическая отчётность по Приказу Минфина России № 158н
        path: "/reports/order-158n",
        element: lazySection(<Order158nReportsPage />),
      },
      {
        path: "/contract-registry",
        element: <ContractRegistryPage />,
      },
      {
        // Карточка контракта: реестр показывает только сводку с прогрессбарами,
        // детали (этапы, платежи, приёмки, поставки, СМП) — на этом роуте
        path: "/contract-registry/:id",
        element: lazySection(<ContractCardPage />),
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
          {
            index: true,
            element: lazySection(<ContractChangeRegistryPage />),
          },
          { path: "new", element: lazySection(<ContractChangeFormPage />) },
          { path: ":id", element: lazySection(<ContractChangeDetailPage />) },
          {
            path: ":id/edit",
            element: lazySection(<ContractChangeFormPage />),
          },
        ],
      },
      {
        // Электронное актирование по ст. 94 44-ФЗ: приёмка, расхождения,
        // мотивированный отказ и регистрация документа в ЕИС
        path: "/acceptances",
        children: [
          { index: true, element: lazySection(<AcceptanceRegistryPage />) },
          { path: "new", element: lazySection(<AcceptanceFormPage />) },
          { path: ":id", element: lazySection(<AcceptanceDetailPage />) },
          { path: ":id/edit", element: lazySection(<AcceptanceFormPage />) },
        ],
      },
      {
        path: "/eis/smp-export",
        element: lazySection(<EisSmpExportPage />),
      },
      {
        // Исходящие пакеты в ЕИС: подпись, статусы и ошибки ФЛК
        path: "/eis/packages",
        element: lazySection(<EisPackagesPage />),
      },
      {
        // Обозреватель XSD Альбома ЕИС: версии, пространства имён, типы и поля
        path: "/eis/schemas",
        element: lazySection(<EisSchemaExplorerPage />),
      },
      {
        // Сквозная цепочка: план-график → СЗ → извещение → контракт → СМП
        path: "/eis/chains",
        element: lazySection(<EisChainPage />),
      },
      {
        // Обращение в ЕИС на получение тестового доступа
        path: "/eis/test-access",
        element: lazySection(<EisTestAccessPage />),
      },
      {
        // Справочник ОКПД2: поиск по коду/наименованию, признак нормирования
        path: "/okpd2",
        element: lazySection(<Okpd2Dictionary />),
      },
      {
        // Типовые требования по п. 7 ПП РФ N 926 для нормируемых кодов ОКПД2
        path: "/norming-requirements",
        element: lazySection(<NormingRequirementsPage />),
      },
      {
        // Реестр законодательных актов и связей норм с компонентами системы
        path: "/legal-acts",
        element: lazySection(<LegalActsRegistry />),
      },
      {
        // Compliance & Liability Mapping: обязанности 158н → нормы КоАП
        path: "/liability-mapping",
        element: lazySection(<LiabilityMappingPage />),
      },
      {
        // Журнал действий с ЭП заказчика: кто, когда, каким сертификатом подписал
        path: "/eds/journal",
        element: lazySection(<EdsJournalPage />),
      },
      {
        // Модуль расчёта НМЦК методом сопоставимых рыночных цен (анализ рынка)
        path: "/nmck-calculator",
        element: lazySection(<NmckCalculatorPage />),
      },
      {
        // Дефектовки: роль «инициатор закупки» — объёмы работ, проект сметы
        // контракта (421/пр) и проект календарного графика (336/пр)
        path: "/defect-lists",
        element: lazySection(<DefectListsPage />),
      },
      {
        // Отдельный модуль «смета + обоснование НМЦК»: вход — дефектовка,
        // выход — утверждённый документ, доступный из дефектовки
        path: "/estimates",
        element: lazySection(<EstimatesPage />),
      },
      {
        path: "/estimates/:id",
        element: lazySection(<EstimateEditorPage />),
      },
      {
        // Оценка заявок: критерии, значимость и баллы по ПП РФ N 2604
        path: "/bid-evaluations",
        element: lazySection(<BidEvaluationsPage />),
      },
      {
        // График отпусков (форма Т-2): планирование, проверки ТК РФ, выгрузки
        path: "/vacation-schedule",
        element: lazySection(<VacationSchedulePage />),
      },
      {
        // Система уведомлений о приближении сроков исполнения контрактов и этапов 44-ФЗ
        path: "/notifications",
        element: lazySection(<DeadlineNotificationsPage />),
      },
      {
        // Генерация типовых форм документов по карточкам закупок и Document Checker по реестру НПА
        path: "/documents",
        element: lazySection(<ProcurementDocumentsPage />),
      },
      {
        // Полный структурированный перечень UI-решений: назначение, место применения и реализация
        path: "/ui-solutions",
        element: lazySection(<UiSolutionsPage />),
      },
      {
        // Фирменный знак: варианты, палитра, правила и файлы для скачивания
        path: "/brand",
        element: lazySection(<BrandPage />),
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
