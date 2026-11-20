import { createBrowserRouter, RouterProvider } from "react-router-dom";
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
import ContractChangeRegistryPage from "./components/ContractChange/ContractChangeRegistryPage";
import ContractChangeFormPage from "./components/ContractChange/ContractChangeFormPage";
import ContractChangeDetailPage from "./components/ContractChange/ContractChangeDetailPage";
import Okpd2Dictionary from "./components/Okpd2Ref/Okpd2Dictionary";
import LegalActsRegistry from "./components/LegalAct/LegalActsRegistry";
import LiabilityMappingPage from "./components/LiabilityMapping/LiabilityMappingPage";
import TaskDetailPage from "./components/Tasks/TaskDetailPage";
import EisSmpExportPage from "./components/Eis/EisSmpExportPage";
import EisPackagesPage from "./components/Eis/EisPackagesPage";
import EisSchemaExplorerPage from "./components/Eis/EisSchemaExplorerPage";
import NormingRequirementsPage from "./components/NormingRequirements/NormingRequirementsPage";
import EdsJournalPage from "./components/Eds/EdsJournalPage";
import NmckCalculatorPage from "./components/Nmck/NmckCalculatorPage";
import DefectListsPage from "./components/DefectList/DefectListsPage";
import BidEvaluationsPage from "./components/BidEvaluation/BidEvaluationsPage";
import VacationSchedulePage from "./components/VacationSchedule/VacationSchedulePage";
import DeadlineNotificationsPage from "./components/Notifications/DeadlineNotificationsPage";
import ProcurementDocumentsPage from "./components/ProcurementDocuments/ProcurementDocumentsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { path: "/", element: <HomePage /> },
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
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
