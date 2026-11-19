# Каталог типов Альбома ТФФ 17.0

Сгенерирован из `Schemas44/` official XSD 17.0 (iteration 2).
Не редактировать вручную: `./generate-type-catalog.ps1`.

Всего глобальных определений: **3548**.

| KIND | COUNT |
| --- | ---: |
| complexType | 1674 |
| simpleType | 690 |
| element | 1177 |
| group | 3 |
| attributeGroup | 4 |

## По файлам

| FILE | NS | CT | ST | Elem | Groups | AttrGroups |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| BaseTypes.xsd | 1 | 74 | 384 | 0 | 0 | 0 |
| CommonTypes.xsd | 1 | 219 | 0 | 0 | 0 | 4 |
| docs-https-api.xsd | https | 4 | 5 | 9 | 0 | 0 |
| docs-ws-api.xsd | priz | 5 | 8 | 21 | 0 | 0 |
| eis-fs-ws-api.xsd | data | 18 | 9 | 7 | 0 | 0 |
| eisSignIncoming.xsd | 1 | 34 | 4 | 2 | 0 | 0 |
| eisSigningSOAPMessages.xsd | messages | 10 | 0 | 18 | 0 | 0 |
| fcsExport.xsd | 1 | 0 | 0 | 1 | 0 | 0 |
| fcsExtegration.xsd | 1 | 0 | 0 | 226 | 0 | 0 |
| fcsIntegration.xsd | 1 | 1 | 2 | 383 | 0 | 0 |
| fcsPrintForm.xsd | 1 | 15 | 6 | 397 | 3 | 0 |
| GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | ws | 4 | 8 | 12 | 0 | 0 |
| GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | ws | 4 | 8 | 14 | 0 | 0 |
| GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | ws | 17 | 14 | 26 | 0 | 0 |
| GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | ws | 7 | 6 | 10 | 0 | 0 |
| GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | ws | 8 | 7 | 16 | 0 | 0 |
| Integration615Types.xsd | 1 | 79 | 0 | 0 | 0 | 0 |
| IntegrationCETypes.xsd | 1 | 22 | 0 | 0 | 0 | 0 |
| IntegrationCPTypes.xsd | 1 | 113 | 0 | 0 | 0 | 0 |
| IntegrationEATypes.xsd | 1 | 4 | 1 | 0 | 0 | 0 |
| IntegrationEPTypes.xsd | 1 | 236 | 0 | 0 | 0 | 0 |
| IntegrationKOTypes.xsd | 1 | 26 | 3 | 0 | 0 | 0 |
| IntegrationPFTypes.xsd | 1 | 1 | 0 | 0 | 0 | 0 |
| IntegrationSMTypes.xsd | 1 | 15 | 0 | 0 | 0 | 0 |
| IntegrationTPTypes.xsd | 1 | 26 | 11 | 0 | 0 | 0 |
| IntegrationTypes.xsd | 1 | 701 | 211 | 0 | 0 | 0 |
| IntegrationURTypes.xsd | 1 | 8 | 0 | 0 | 0 | 0 |
| lkp-eisPrintForm.xsd | 1 | 0 | 0 | 26 | 0 | 0 |
| QueueVBS\IntegrationVBSTypes.xsd | 1 | 18 | 1 | 0 | 0 | 0 |
| QueueVBS\queue-vbs-ws-api.xsd | ws | 2 | 2 | 4 | 0 | 0 |
| QueueVBS\vbsExport.xsd | 1 | 0 | 0 | 1 | 0 | 0 |
| queue-ws-api.xsd | ws | 3 | 0 | 4 | 0 | 0 |

## complexType

| NAME | FILE | DESCRIPTION |
| --- | --- | --- |
| `aaChangeInfoType` | IntegrationCPTypes.xsd | Тип: Соглашение об изменении контракта |
| `aaChangeReasonInfoType` | IntegrationCPTypes.xsd | Тип: Изменение контракта |
| `aaCommonInfoType` | IntegrationCPTypes.xsd | Тип: Общая информация для доп.соглашения |
| `aaReasonInfoType` | IntegrationCPTypes.xsd | Тип: Причина изменений условий контракта |
| `aaTerminationInfoType` | IntegrationCPTypes.xsd | Тип: Соглашение о расторжении контракта |
| `abandonedReasonRef` | BaseTypes.xsd | Ссылка на справочник "Основания признания торгов несостоявшимися" (nsiAbandonedReason) |
| `accountDetailsForDeltaType` | CommonTypes.xsd | Тип: Платежные реквизиты без обязательности для доп.соглашения |
| `accountDetailsType` | CommonTypes.xsd | Тип: Платежные реквизиты |
| `accountDetailsWithoutIdentifiersType` | CommonTypes.xsd | Тип: Платежные реквизиты без идентификаторов |
| `accountDetailsWithoutOblType` | CommonTypes.xsd | Тип: Платежные реквизиты без обязательности |
| `actCancelType` | Integration615Types.xsd | Информация об отмене акта |
| `actCommonInfoType` | Integration615Types.xsd | Тип: Общая информация об акте |
| `actDeviationType` | Integration615Types.xsd | Акт об уклонении победителя ЭА от заключения договора |
| `actEvasionType` | Integration615Types.xsd | Акт об отказе от заключения договора о проведении капитального ремонта с победителем ЭА |
| `addInfoKTRURef` | CommonTypes.xsd | Тип: Ссылка на справочник дополнительных сведений позиции правой части КТРУ |
| `additionalAgreementInfoType` | IntegrationCPTypes.xsd | Тип: Информация о дополнительном соглашении |
| `additionalAgreementType` | IntegrationCPTypes.xsd | Тип: Доп. соглашение с типом внесение изменений (ЛКП) |
| `additionalDocType` | IntegrationCPTypes.xsd | Тип: Информация, полученная от поставщика вместе с подписанным проектом контракта |
| `addRequirementType` | CommonTypes.xsd | Тип: Дополнительное требование к участникам |
| `admissionResultsProtocolMemberType` | IntegrationEPTypes.xsd | Тип: Результаты допуска заявки EOK20 |
| `admissionResultsType` | IntegrationEPTypes.xsd | Тип: Результаты допуска заявки |
| `appCommonInfoEMZType` | IntegrationEPTypes.xsd | Тип: Общая информация о заявке (ЭМЗ) |
| `appCommonInfoProtocolMemberType` | IntegrationEPTypes.xsd | Тип: Информация о заявке EOK20 |
| `appCommonInfoType` | IntegrationEPTypes.xsd | Тип: Общая информация о заявке |
| `appCorrespondence2020Type` | IntegrationEPTypes.xsd | Тип: Соответствие участника преимуществам, требованиям к участникам (согласно действующему извещению о закупке / изменению извещения) с даты начала действия оптимизационного законопроекта 44-ФЗ |
| `appCorrespondenceType` | IntegrationEPTypes.xsd | Тип: Соответствие участника преимуществам, требованиям к участникам (согласно действующему извещению о закупке / изменению извещения) |
| `appleadActionRef` | BaseTypes.xsd | Тип: Ссылка на справочник "Обжалуемые действия" |
| `applicantInfoType` | IntegrationKOTypes.xsd | Тип: Сведения о заявителе |
| `applicationGuaranteePaymentInfoType` | IntegrationEPTypes.xsd | Тип: Информация о платеже для обеспечения заявки |
| `appRejectedReasonExpl4000Type` | CommonTypes.xsd | Тип: Причины отказа рассмотрения заявки с размерностью поля "Обоснование" = 4000 символов |
| `appRejectedReasonType` | CommonTypes.xsd | Тип: Причины отказа рассмотрения заявки |
| `appRejectedReasonType` | Integration615Types.xsd | Тип: Причины отказа рассмотрения заявки |
| `approvalIndividualPersonForeignStateInfoType` | IntegrationKOTypes.xsd | Тип: Физическое лицо иностранного государства в обращении в контрольный орган |
| `approvalIndividualPersonRFInfoType` | IntegrationKOTypes.xsd | Тип: Физическое лицо РФ в обращении в контрольный орган |
| `approvalLegalEntityForeignStateInfoType` | IntegrationKOTypes.xsd | Тип: Юридическое лицо иностранного государства в обращении в контрольный орган |
| `approvalLegalEntityRFInfoType` | IntegrationKOTypes.xsd | Тип: Юридическое лицо РФ в обращении в контрольный орган |
| `approvalMismatch` | eisSignIncoming.xsd | Пакет данных: Уведомление о выявленных в обращении несоответствиях |
| `approvalMismatchType` | IntegrationKOTypes.xsd | Тип: Уведомление о выявленных в обращении несоответствиях |
| `approvalTransfer` | eisSignIncoming.xsd | Пакет данных: Информация о передаче обращения в другой контрольный орган |
| `approvalTransferType` | IntegrationKOTypes.xsd | Тип: Информация о передаче обращения в другой контрольный орган |
| `approvalType` | IntegrationKOTypes.xsd | Тип: Обращение в контрольный орган |
| `as2PacketType` | fcsIntegration.xsd | Пакет данных AS2 протокола |
| `attachmentListNotPublishedOnEISType` | CommonTypes.xsd | Тип: Прикрепленные документы с полем notPublishedOnEIS |
| `attachmentListSignCheckUrlType` | CommonTypes.xsd | Тип: Прикрепленные документы с полем signatureCheckUrl |
| `attachmentListType` | CommonTypes.xsd | Тип: Прикрепленные документы |
| `attachmentListType` | Integration615Types.xsd | Тип: Прикрепленные документы |
| `attachmentListWithCSWithKindType` | CommonTypes.xsd | Тип: Прикрепленные документы с необязательным блоком "Электронная подпись документа" (cryptoSigns) с указанием типа документа |
| `attachmentListWithDSUidType` | CommonTypes.xsd | Тип: Прикрепленные документы c указанием гуидов ХД |
| `attachmentListWithEAKindType` | CommonTypes.xsd | Тип: Прикрепленные документы с указанием вида документа электронного актирования |
| `attachmentListWithKindType` | CommonTypes.xsd | Тип: Прикрепленные документы с указанием вида |
| `attachmentListWithMandatoryCSType` | CommonTypes.xsd | Тип: Прикрепленные документы с обязательным блоком "Электронная подпись документа" (cryptoSigns) |
| `attachmentNotPublishedOnEISType` | CommonTypes.xsd | Тип: Прикрепленный документ с полем notPublishedOnEIS |
| `attachmentType` | CommonTypes.xsd | Тип: Прикрепленный документ |
| `attachmentType` | Integration615Types.xsd | Тип: Прикрепленный документ |
| `attachmentWithCSWithKindType` | CommonTypes.xsd | Тип: Прикрепленный документ с обязательным блоком "Электронная подпись документа" (cryptoSigns) с указанием типа документа |
| `attachmentWithDSUidType` | CommonTypes.xsd | Тип: Прикрепленный документ с указанием гуидов ХД |
| `attachmentWithEAKindType` | CommonTypes.xsd | Тип: Прикрепленный документ, с указанием вида документа электронного актирования |
| `attachmentWithKindType` | CommonTypes.xsd | Тип: Прикрепленный документ, с указанием вида |
| `attachmentWithMandatoryCSType` | CommonTypes.xsd | Тип: Прикрепленный документ с обязательным блоком "Электронная подпись документа" (cryptoSigns) |
| `attachmentWithStoreListType` | CommonTypes.xsd | Тип: Прикрепленные документы со ссылкой на ХД |
| `attachmentWithStoreType` | CommonTypes.xsd | Тип: Прикрепленный документ со ссылкой на ХД |
| `authorityPrescriptionType` | Integration615Types.xsd | Тип: Предписание органа, уполномоченного на осуществление контроля |
| `authorityPrescriptionType` | IntegrationCPTypes.xsd | Тип: Предписание органа, уполномоченного на осуществление контроля |
| `authorityPrescriptionType` | IntegrationEPTypes.xsd | Тип: Предписание органа, уполномоченного на осуществление контроля |
| `bankGuaranteeInfoType` | CommonTypes.xsd | Тип: Независимая гарантия |
| `bankSupportContractRequiredInfo2020Type` | CommonTypes.xsd | Тип: Информации о банковском и (или) казначейском сопровождении контакта для ЭA20,ЭОК20,ЭЗК20,ЭЗТ,ЭЗакА20,ЭЗакК20 |
| `bankSupportContractRequiredInfoType` | CommonTypes.xsd | Тип: Информации о банковском и (или) казначейском сопровождении контакта |
| `baseFaultPacketType` | eis-fs-ws-api.xsd | Тип для пакета данных: Исключение: Базовое исключение |
| `baseFaultType` | eis-fs-ws-api.xsd | Тип: Исключение: Базовое исключение |
| `bidType` | Integration615Types.xsd | Тип: Ценовое предложение |
| `bidType` | IntegrationEPTypes.xsd | Тип: Ценовое предложение |
| `BO2020InfoType` | IntegrationEPTypes.xsd | Тип: Информация о бюджетном обязательстве в требованиях заказчика с даты начала действия оптимизационного законопроекта 44-ФЗ |
| `BOBudgetFinancingsType` | IntegrationEPTypes.xsd | Тип: План оплаты исполнения контракта |
| `BOBudgetFinancingType` | IntegrationEPTypes.xsd | Тип: Запись плана исполнения контракта за счет бюджетных средств |
| `boCommonType` | QueueVBS\IntegrationVBSTypes.xsd | Тип: Сведения о бюджетном обязательстве (БО). Общий тип |
| `boDeniedRegistrationType` | QueueVBS\IntegrationVBSTypes.xsd | Тип: Сведения о бюджетном обязательстве (БО), отказанные в постановке на учет |
| `BOInfoType` | IntegrationEPTypes.xsd | Тип: Информация о бюджетном обязательстве в требованиях заказчика |
| `boNotificationPublishType` | QueueVBS\IntegrationVBSTypes.xsd | Тип: Сведения о бюджетном обязательстве (БО), включенные в размещенное извещение о проведении процедуры закупки |
| `BOObjectInfoType` | docs-https-api.xsd | Тип: Краткие сведения о документе БО |
| `boProjectType` | QueueVBS\IntegrationVBSTypes.xsd | Тип: Проект сведений о бюджетном обязательстве (БО) |
| `boRegistredType` | QueueVBS\IntegrationVBSTypes.xsd | Тип: Сведения о бюджетном обязательстве (БО), поставленные на учет |
| `boSentForVerificationType` | QueueVBS\IntegrationVBSTypes.xsd | Тип: Сведения о бюджетном обязательстве (БО), направленные на проверку в ТОФК |
| `btkContractTermType` | CommonTypes.xsd | Тип: Структурированные типовые условия контракта в БТК |
| `budgetFundsContractRef` | BaseTypes.xsd | Ссылка на код и наименование бюджета в контракте |
| `budgetLevelRef` | BaseTypes.xsd | Ссылка на справочник "Уровни бюджетов" (budgetLeve) |
| `byGARInfoType` | CommonTypes.xsd | Тип: Место поставки товара, выполнения работы или оказания услуги по ГАР |
| `byGARWithSidECInfoType` | CommonTypes.xsd | Тип: Место поставки товара, выполнения работы или оказания услуги по ГАР с идентификаторами ПЭК |
| `cancelInfoType` | CommonTypes.xsd | Тип: Информация об отмене для сводного документа |
| `cancelInfoType` | IntegrationEPTypes.xsd | Тип: Информация об отмене продления |
| `cancelLKPType` | IntegrationCPTypes.xsd | Тип: Информация об отмене процедуры заключения контракта (ЛКП) |
| `cancelReasonRef` | BaseTypes.xsd | Ссылка на справочник "Причины отмены доверенности" (nsiPOACancelReason) |
| `cancelType` | IntegrationCPTypes.xsd | Тип: Информация об отмене процедуры заключения контракта |
| `cancelWithoutCustomerDecisionType` | IntegrationEPTypes.xsd | Тип: Отмена документа закупки без отмены на по решению заказчика |
| `changePriceFoundationRef` | BaseTypes.xsd | Ссылка на справочник "Обоснования изменения цены контракта" (nsiContractPriceChangeReason) |
| `changeReasonType` | Integration615Types.xsd | Тип: Основание внесения изменений |
| `changeReasonType` | IntegrationEPTypes.xsd | Тип: Основание внесения изменений |
| `changeReasonWithoutCustomerDecisionType` | IntegrationEPTypes.xsd | Тип: Основание внесения изменений без изменений на основании решения заказчика |
| `changeType` | CommonTypes.xsd | Тип: Информация об изменении в проекте контракта, направляемого участнику |
| `characteristicsFillingInstructionsRef` | BaseTypes.xsd | Ссылка на справочник "Инструкции по заполнению характеристик в заявке" |
| `checklistsType` | CommonTypes.xsd | Тип: Общий тип объединяющий списки проверок всех типов документов |
| `checkPlan` | eisSignIncoming.xsd | Пакет данных:План проверок для ИС КО |
| `checkResult` | eisSignIncoming.xsd | Пакет данных:Результат контроля для ИС КО |
| `checkResultCancel` | eisSignIncoming.xsd | Пакет данных:Информация об отмене результата контроля для ИС КО |
| `checkResultType` | IntegrationCPTypes.xsd | Тип: Результата контроля проекта контракта с единственным поставщиком "с улицы" |
| `chunkRequestPacketType` | eis-fs-ws-api.xsd | Тип для пакета данных: Запрос на передачу части файла |
| `chunkRequestType` | eis-fs-ws-api.xsd | Тип: Запрос на передачу части файла |
| `chunkResponsePacketType` | eis-fs-ws-api.xsd | Тип для пакета данных: Ответ на запрос передачи части файла |
| `chunkResponseType` | eis-fs-ws-api.xsd | Тип: Ответ на запрос передачи части файла |
| `claimsCorrespondenceNoticeType` | IntegrationURTypes.xsd | Тип: Уведомление в рамках претензионной переписки, сформированное заказчиком |
| `clarificationDocRequestType` | IntegrationEPTypes.xsd | Тип: Запрос о даче разъяснений положений извещения об осуществлении закупки |
| `clarificationDocType` | IntegrationEPTypes.xsd | Тип:Разъяснения положений извещения об осуществлении закупки |
| `clarificationRequestType` | Integration615Types.xsd | Запрос ЭП о даче разъяснений положений документации по ПП РФ № 615 |
| `clarificationRequestType` | IntegrationEPTypes.xsd | Тип: Запрос о даче разъяснений |
| `clarificationResultRequestType` | IntegrationEPTypes.xsd | Тип: Запрос о даче разъяснений результатов (не применяется для СОП EF2020, EOK2020, EZK2020, EZT) |
| `clarificationResultType` | IntegrationEPTypes.xsd | Тип: Разъяснение результатов (не применяется для СОП EF2020, EOK2020, EZK2020, EZT) |
| `clarificationType` | Integration615Types.xsd | Разъяснение положений документации/Дополнительная информация |
| `clarificationType` | IntegrationEPTypes.xsd | Тип: Разъяснение /Дополнительная информация |
| `closedEPCasesRef` | BaseTypes.xsd | Ссылка на справочник "Случаи проведения закрытой электронной процедуры" (nsiClosedEPCases) |
| `closedParElectronicComplaintCancelType` | IntegrationKOTypes.xsd | Тип: Информация об отзыве сокрытой электронной жалобы, сформированной в ЛКП |
| `closedParElectronicComplaintType` | IntegrationKOTypes.xsd | Тип: Информация об сокрытой электронной жалобе, сформированной в ЛКП |
| `commissionMemberType` | CommonTypes.xsd | Тип: Член комиссии |
| `commissionMemberType` | Integration615Types.xsd | Тип: Член комиссии |
| `commissionRoleType` | CommonTypes.xsd | Тип: Роли членов комиссий |
| `commissionRoleType` | Integration615Types.xsd | Тип: Роли членов комиссий |
| `commissionType` | CommonTypes.xsd | Тип: Комиссии по размещению заказа (определению поставщика) |
| `commissionType` | Integration615Types.xsd | Тип: Комиссии по размещению заказа (определению поставщика) |
| `commonCancelInfoType` | CommonTypes.xsd | Тип: Общая информация для извещения об отмене |
| `commonContractExecutionType` | CommonTypes.xsd | Тип: Общая информация о размещении контракта для сводной информации |
| `commonContractProjectInfoType` | CommonTypes.xsd | Тип: Общая информация для проекта контракта по ед.поставщику |
| `commonCPWithRevisionInfoType` | CommonTypes.xsd | Тип: Общая информация для проекта контракта по ед.поставщику (с ревизией) |
| `commonExecutionType` | CommonTypes.xsd | Тип: Общая информация о размещении СВИК для сводной информации |
| `commonExecutionWithoutUidType` | CommonTypes.xsd | Тип: Общая информация о размещении СВИК для сводной информации без идентификаторов |
| `commonInfoType` | IntegrationCPTypes.xsd | Тип: Общая информация |
| `commonOnlyParticipantInfoType` | CommonTypes.xsd | Тип: Виды закупок по поставщикам (общая информация, поставщик) |
| `commonProcedureCancelInfoType` | CommonTypes.xsd | Тип: Виды закупок по поставщикам (общая информация, поставщик, информация о контракте) |
| `commonProjectInfoType` | IntegrationCPTypes.xsd | Тип: Виды закупок по поставщикам (ЛКП) |
| `commonProjectSignInfoType` | CommonTypes.xsd | Тип: Общая информация для подписанного контракта поставщиком |
| `commonProjectSignWithRevisionInfoType` | CommonTypes.xsd | Тип: Общая информация для подписанного контракта поставщиком (с ревизией) |
| `commonRefusalInfoType` | CommonTypes.xsd | Тип: Виды закупок по поставщикам (общая информация, поставщик) для отказа |
| `commonRefusalKPMType` | CommonTypes.xsd | Тип: Закупка по конкурентной процедуре (общая информация, поставщик) для отказа |
| `commonRefusalOnlyParticipantType` | CommonTypes.xsd | Тип: Закупка у прямого единственного поставщика (общая информация, поставщик) для отказа |
| `commonUnitsMeasurementsRef` | BaseTypes.xsd | Ссылка на справочник "Общепринятые единицы измерения" (commonUnitsMeasurements) |
| `competitionApp1Type` | IntegrationEPTypes.xsd | Тип: Заявка, входящая в протокол рассмотрения и оценки первых частей заявок на участие в конкурсе |
| `competitionApp2Type` | IntegrationEPTypes.xsd | Тип: Заявка, входящая в протокол рассмотрения и оценки вторых частей заявок на участие в конкурсе |
| `competitionApp3Type` | IntegrationEPTypes.xsd | Тип: Заявка, входящая в протокол подведения итогов конкурса |
| `competitiveProcedureType` | IntegrationCPTypes.xsd | Тип: Конкурентные процедуры (ЛКП) |
| `complaint` | eisSignIncoming.xsd | Пакет данных: Информация по жалобе для ИС КО. Прием пакета не осуществляется, начиная с версии 15.3 |
| `complaintCancel` | eisSignIncoming.xsd | Пакет данных: Информация об отзыве жалобы для ИС КО |
| `complaintGroup` | eisSignIncoming.xsd | Пакет данных: Информация по групповой жалобе для ИС КО. Прием пакета не осуществляется, начиная с версии 15.3 |
| `complaintRefusalReasonRefType` | CommonTypes.xsd | Тип: Ссылка на справочник причин отказа в рассмотрении жалобы |
| `complaintTransfer` | eisSignIncoming.xsd | Пакет данных:Информация о передаче жалобы по подведомственности / ведомственной принадлежности |
| `complianceContractProjectInfoType` | CommonTypes.xsd | Тип: Требования к информации, предоставляемой поставщиков для заключения контракта |
| `complianceProjectSignType` | CommonTypes.xsd | Тип: Подтверждающая информация соответствия единым требованиям для контракта подписанного поставщиком |
| `conditionScoringZPType` | IntegrationEPTypes.xsd | Тип: Оценка предложения участника по отдельному критерию оценки в протоколе в рамках проведения запроса предложений в электронной форме |
| `confirmationEMZType` | IntegrationEPTypes.xsd | Тип: Результат обработки с присвоенным реестровым номером и датой публикации документа (ЭМЗ) |
| `confirmationType` | IntegrationKOTypes.xsd | Тип: Результат обработки |
| `contactInfoType` | Integration615Types.xsd | Тип: Контактная информация |
| `contactInfoType` | IntegrationEPTypes.xsd | Тип: Контактная информация |
| `contactPersonType` | IntegrationTPTypes.xsd | Тип: ФИО и должность |
| `contactPersonType` | IntegrationTypes.xsd |  |
| `contractChecklistType` | CommonTypes.xsd | Тип: Список проверок по документу "Информация (проект информации) о заключенном контракте с 01.01.2015" |
| `contractCommonInfoType` | Integration615Types.xsd | Тип: Общая информация о договоре проведения капитального ремонта по ПП РФ № 615 |
| `contractConditions2020Type` | IntegrationEPTypes.xsd | Тип: Условия контракта с даты начала действия оптимизационного законопроекта 44-ФЗ |
| `contractConditionsInfoDeltaType` | IntegrationCPTypes.xsd | Тип: Условия контракта для доп.соглашения |
| `contractConditionsType` | IntegrationEPTypes.xsd | Тип: Условия контракта |
| `contractControlNCType` | IntegrationCPTypes.xsd | Тип: Контракт по закупке малого объема с котировочной сессией, подписанный во внешней системе с уведомлением о соответствии контролируемой информации |
| `contractDiscrepancyProtocolType` | Integration615Types.xsd | Протокол о несоответствии проверяемой информации по ПП РФ № 615 |
| `contractDocCommonInfoType` | Integration615Types.xsd | Тип: Общая информация о документах по договору о проведении капитального ремонта по ПП РФ № 615 |
| `contractExecutionBaseDocReasonType` | IntegrationCETypes.xsd | Документ, являющийся основанием |
| `contractExecutionDocAcceptanceType` | IntegrationCETypes.xsd | Тип: Сведения об исполнении контракта по документу о приемке (ЦРК) |
| `contractExecutionObligationGuaranteeType` | IntegrationCETypes.xsd | Тип: Сведения о наступлении гарантийного случая или исполнении гарантийных обязательств (ЦРК) |
| `contractExecutionOtherType` | IntegrationCETypes.xsd | Тип: Иные сведения об исполнении контракта (ЦРК) |
| `contractExecutionPaymentType` | IntegrationCETypes.xsd | Тип: Сведения об оплате (возврате оплаты) (ЦРК) |
| `contractExecutionPenaltyAccrualType` | IntegrationCETypes.xsd | Тип: Сведения о начислении неустойки (ЦРК) |
| `contractExecutionPenaltyHoldingType` | IntegrationCETypes.xsd | Тип: Сведения об удержании неустойки (ЦРК) |
| `contractExecutionPenaltyWriteOffType` | IntegrationCETypes.xsd | Тип: Сведения о списании неустойки (ЦРК) |
| `contractExecutionType` | IntegrationCETypes.xsd | Тип: Сводная информация о контракте (ЦРК) |
| `contractFileType` | IntegrationCPTypes.xsd | Тип: Файл контракта |
| `contractFinancingInfoDeltaType` | IntegrationCPTypes.xsd | Тип: Финансирование контракта для дельты электронного доп соглашения |
| `contractGuaranteePaymentInfoType` | IntegrationEPTypes.xsd | Тип: Информация о платеже для обеспечения исполнения контракта, начиная с версии ЕИС 9.3 |
| `contractInfo` | IntegrationCETypes.xsd | Информация о контракте |
| `contractInfoWithoutStageType` | IntegrationCETypes.xsd | Информация о контракте без информации об этапе |
| `contractLifeCycleCaseRef` | BaseTypes.xsd | Ссылка на справочник "Случаи заключения контракта жизненного цикла" (nsiTenderPlan2017ContractLifeCycleCase) |
| `contractMultiType` | IntegrationEPTypes.xsd | Тип: Право заключения контракта с несколькими участниками закупки |
| `contractOKEIExtendedRef` | BaseTypes.xsd | Ссылка на ОКЕИ в Реестре контрактов расширенная |
| `contractOKEIRef` | BaseTypes.xsd | Ссылка на ОКЕИ в Реестре контрактов |
| `contractOrganizationInfoType` | Integration615Types.xsd | Тип: Данные организации участвующей в договоре |
| `contractorInfoType` | Integration615Types.xsd | Тип: Сведения о подрядной организации в сведениях о договоре о проведении капитального ремонта по ПП РФ № 615 |
| `contractPriceInfoDeltaType` | IntegrationCPTypes.xsd | Тип: Цена контракта для дельты электронного доп соглашения |
| `contractProcedureCancellFailureType` | IntegrationCETypes.xsd | Тип: Отмена информации об отмене сведений об исполнении (расторжении) контракта (ЦРК) |
| `contractProcedureCancelType` | Integration615Types.xsd | Отмена информации об исполнении/расторжении договора о проведении капитального ремонта по ПП РФ № 615 |
| `contractProcedureCancelType` | IntegrationCETypes.xsd | Тип: Отмена сведений об исполнении (расторжении) контракта (ЦРК) |
| `contractProcedureChecklistType` | CommonTypes.xsd | Тип: Список проверок по документу "Информация об исполнении (исполнении обязательств по предоставленной гарантии качества, расторжении, возврата переплаты по контракту, признании контракта недействительным) контракта с 01.01.2015" |
| `contractProcedureType` | Integration615Types.xsd | Сведения об исполнении/расторжении договора о проведении капитального ремонта по ПП РФ № 615; внесение изменений |
| `contractProcedureUnilateralRefusalCancelType` | IntegrationURTypes.xsd | Тип: Извещение об отмене решения об одностороннем отказе от исполнения контракта, сформированное заказчиком |
| `contractProcedureUnilateralRefusalType` | IntegrationURTypes.xsd | Тип: Решение об одностороннем отказе от исполнения контракта, сформированное заказчиком |
| `contractProjectChangeLKPType` | IntegrationCPTypes.xsd | Тип: Доработанный проект контракта на основании размещенного поставщиком протокола разногласий (ЛКП) |
| `contractProjectChangeType` | IntegrationCPTypes.xsd | Тип: Доработанный проект контракта на основании размещенного поставщиком протокола разногласий |
| `contractProjectCommonType` | IntegrationCPTypes.xsd | Тип: Общий тип для проекта контракта |
| `contractProjectFileRowAttrsType` | IntegrationCPTypes.xsd | Тип: Файл проекта контрактов с атрибутами по строкам |
| `contractProjectFileType` | IntegrationCPTypes.xsd | Тип: Файл проекта контрактов |
| `contractProjectInfoForPrintType` | CommonTypes.xsd | Тип: Информация о контракте по ед.поставщику (для печати) |
| `contractProjectInfoType` | CommonTypes.xsd | Тип: Информация о контракте по ед.поставщику |
| `contractProjectLKPType` | IntegrationCPTypes.xsd | Тип: Проект контракта без подписей (ЛКП) |
| `contractProjectOutsideInfoType` | IntegrationCPTypes.xsd | Тип: Информация о контракте по ед.поставщику "с улицы" |
| `contractProjectSignFileType` | IntegrationCPTypes.xsd | Тип: Файл проекта контрактов подписанный поставщиком |
| `contractProjectSignLKPType` | IntegrationCPTypes.xsd | Тип: Проект контракта, подписанный поставщиком (ЛКП) |
| `contractProjectSignType` | IntegrationCPTypes.xsd | Тип: Проект контракта, подписанный поставщиком |
| `contractProjectType` | IntegrationCPTypes.xsd | Тип: Проект контракта без подписей |
| `contractRefusalReasonRef` | BaseTypes.xsd | Ссылка на справочник "Основания для отказа от заключения контракта" (nsiContractRefusalReaso) |
| `contractRegNumInfoType` | CommonTypes.xsd | Тип: Номера реестровых записей государственных или муниципальных контрактов |
| `contractRequirementDocType` | IntegrationCPTypes.xsd | Тип: Требования к подтверждающим документам и информации |
| `contractSignLKPType` | IntegrationCPTypes.xsd | Тип: Подписанный контракт (ЛКП) |
| `contractSignType` | Integration615Types.xsd | Сведения о заключенном в электронной форме на ЭП договоре оказания услуг и (или) выполнения работ по капитальному ремонту общего имущества в многоквартирном доме по ПП РФ № 615 |
| `contractSignType` | IntegrationCPTypes.xsd | Тип: Подписанный контракт |
| `contractSubjectInfoDeltaType` | IntegrationCPTypes.xsd | Тип: Предмет контракта для доп.соглашения |
| `contractTerminationDocReasonType` | IntegrationCETypes.xsd | Документ, являющийся основанием расторжения контракта |
| `contractTerminationReasonType` | IntegrationCETypes.xsd | Основание расторжения контракта |
| `contractTerminationReasonType` | IntegrationCPTypes.xsd | Основание расторжения контракта |
| `contractTerminationUnilateralRefusalType` | IntegrationCETypes.xsd | Тип: Сведения об одностороннем расторжении контракта (ЦРК) |
| `contractTermsType` | CommonTypes.xsd | Тип: Структурированные типовые условия контракта в РЭК (таблица) |
| `contractTermType` | CommonTypes.xsd | Тип: Структурированное типовое условие контракта в РЭК |
| `contractType` | Integration615Types.xsd | Сведения о договоре о проведении капитального ремонта по ПП РФ № 615; внесение изменений |
| `contractType` | IntegrationCPTypes.xsd | Тип: Информация о заключенном контракте в бумажной форме |
| `contractTypeSt93Ch1P9Ref` | BaseTypes.xsd | Ссылка на справочник: Тип контракта по п.9 ч.1 ст.93 Закона № 44-ФЗ |
| `contractWSType` | IntegrationCPTypes.xsd | Тип: Контракт по закупке малого объема с котировочной сессией, подписанный во внешней системе |
| `control99ContractProjectExtractType` | IntegrationCPTypes.xsd | Тип: Информация из проекта контракта (РПК), направляемая на контроль по 99 статье в орган контроля |
| `control99ControlAuthorityInfoType` | CommonTypes.xsd | Тип: Сведения об органе контроля для контроля по 99 статье |
| `control99ControlObjectWithMandatoryDocsInfoType` | CommonTypes.xsd | Тип: Сведения об объектах контроля по 99 статье с обязательным блоком controlDocumentsInfo |
| `control99CustomerInfoType` | CommonTypes.xsd | Тип: Сведения о заказчике в ПЗ/ПГ для контроля по 99 статье |
| `control99DocLinkType` | IntegrationTPTypes.xsd | Тип: Ссылка на карточку документа |
| `control99DocsInfoRequestType` | IntegrationSMTypes.xsd | Тип: Запрос информации о прохождении контроля по ч.5 ст. 99 |
| `control99DocsInfoType` | IntegrationSMTypes.xsd | Тип: Информация о прохождении контроля по ч.5 ст. 99 |
| `control99DocumentObjectType` | CommonTypes.xsd | Тип: Документ, содержащий информацию об объекте контроля по 99 статье |
| `control99DocumentObjectType` | IntegrationTPTypes.xsd | Тип: Документ, содержащий информацию об объекте контроля по 99 статье |
| `control99NoticeComplianceWithDocChecklistType` | CommonTypes.xsd | Тип: Уведомление о соответствии контролируемой информации, принятое вместе с контролируемым документом и списком проверки |
| `control99NoticeComplianceWithDocType` | CommonTypes.xsd | Тип: Уведомление о соответствии контролируемой информации, принятое вместе с контролируемым документом |
| `control99OwnerInfoType` | IntegrationTPTypes.xsd | Тип: Сведения о владельце версии в ПГ для контроля по 99 статье |
| `control99ResponsibleType` | CommonTypes.xsd | Тип: Ответственный исполнитель для контроля по 99 статье |
| `control99TenderPlan2020ExtractType` | IntegrationTPTypes.xsd | Информация из плана-графика закупок с 01.01.2020, направляемая на контроль по 99 статье в орган контроля |
| `control99TenderPlan2020PositionType` | IntegrationTPTypes.xsd | Тип: Сведения о позиции плана-графика закупок для контроля по 99 статье |
| `controlPaymentDetailsRequestType` | IntegrationCPTypes.xsd | Тип элемента: Запрос проведения проверки платежных данных |
| `controlPaymentDetailsResponseType` | IntegrationCPTypes.xsd | Тип элемента: Ответ на запрос проведения проверки платежных данных |
| `controlResultInfoType` | CommonTypes.xsd | Тип: Результат проверки платежных данных |
| `costCriterionDocOKType` | IntegrationEPTypes.xsd | Тип: Стоимостной критерий оценки в рамках проведения конкурсов в электронной форме |
| `costCriterionDocZPType` | IntegrationEPTypes.xsd | Тип: Стоимостной критерий оценки в рамках проведения запроса предложений в электронной форме |
| `costCriterionProtocolEOK2020FirstSectionsType` | IntegrationEPTypes.xsd | Тип: Стоимостной критерий оценки в протоколе рассмотрения и оценки первых частей заявок на участие в ЭOK20 (открытый конкурс в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `costCriterionProtocolOKType` | IntegrationEPTypes.xsd | Тип: Стоимостной критерий оценки в протоколе в рамках проведения конкурсов в электронной форме |
| `costCriterionProtocolZPType` | IntegrationEPTypes.xsd | Тип: Стоимостной критерий оценки в протоколе в рамках проведения запроса предложений в электронной форме |
| `counterpartyForPayingPenaltiesAndTaxesType` | CommonTypes.xsd | Тип: Информация о контрагенте и его реквизитах для уплаты неустоек (штрафов, пеней) и уплаты налогов |
| `countryType` | IntegrationTypes.xsd |  |
| `courtDecisionType` | Integration615Types.xsd | Тип: Решение судебного органа |
| `courtDecisionType` | IntegrationCPTypes.xsd | Тип: Решение судебного органа |
| `courtDecisionType` | IntegrationEPTypes.xsd | Тип: Решение судебного органа |
| `cpCommonInfoType` | IntegrationCPTypes.xsd | Тип: Общая информация для проекта контракта по конкурентным процедурам |
| `cpContractInfoType` | IntegrationCPTypes.xsd | Тип: Информация о контракте по конкурентной процедуре |
| `cpFoundationInfoType` | IntegrationCPTypes.xsd | Тип: Основание заключения контракта по конкурентным процедурам |
| `cpParticipantInfoType` | IntegrationCPTypes.xsd | Тип: Поставщик для проекта контракта по конкурентным процедурам с номером ЕРУЗ |
| `cpPrintFormType` | CommonTypes.xsd | Тип: Печатная форма для единственного поставщика (с информацией о подписи) |
| `criteriaProposalsType` | IntegrationCPTypes.xsd | Тип: Предложения участника по критериям, предусмотренным пунктами 2 и (или) 3 части 1 статьи 32 Закона № 44-ФЗ |
| `criterionOKType` | IntegrationEPTypes.xsd | Тип: Критерий оценки заявок участников в рамках проведения конкурсов в электронной форме |
| `criterionsScoringDocOKType` | IntegrationEPTypes.xsd | Тип: Критерий оценки без показателей в рамках проведения конкурсов в электронной форме |
| `criterionsScoringDocZPType` | IntegrationEPTypes.xsd | Тип: Критерий оценки без показателей в рамках проведения запроса предложений в электронной форме |
| `criterionsScoringProtocolOKType` | IntegrationEPTypes.xsd | Тип: Критерий оценки без показателей в протоколе в рамках проведения конкурсов в электронной форме |
| `criterionsScoringProtocolZPType` | IntegrationEPTypes.xsd | Тип: Критерий оценки без показателей в протоколе в рамках проведения запроса предложений в электронной форме |
| `criterionValueProtocolFinalType` | IntegrationEPTypes.xsd | Тип: Значение критерия в итоговом протоколе |
| `criterionValueProtocolOK1Type` | IntegrationEPTypes.xsd | Тип: Значение критерия в протоколе рассмотрения и оценки первых и вторых частей заявок на участие в ЭOK (открытый конкурс в электронной форме) |
| `criterionValueType` | IntegrationEPTypes.xsd | Тип: Значение критерия |
| `criterionZPType` | IntegrationEPTypes.xsd | Тип: Критерий оценки заявок участников в рамках проведения запроса предложений в электронной форме |
| `crkContractInfoType` | IntegrationCPTypes.xsd | Тип: Информация о заключенном контракте в целевом реестре контрактов (ЦРК) |
| `currencyCBRFRef` | BaseTypes.xsd | Ссылка на справочник "Список валют, курс на которые устанавливается ЦБ РФ" (nsiContractCurrencyCBRF) |
| `currencyRateContract` | BaseTypes.xsd | Тип: Курс валюты для сведений о контракте |
| `currencyRateType` | CommonTypes.xsd | Тип: Курс валюты |
| `currencyRef` | BaseTypes.xsd | Ссылка на справочник "Общероссийский классификатор валют" (ОКВ) (nsiCurrency) |
| `customerInfoDeltaType` | IntegrationCPTypes.xsd | Тип: Информация о заказчике для дельты электронного доп соглашения |
| `customerInfoType` | IntegrationCETypes.xsd | Информация о заказчике |
| `customerRequirementEF2020Type` | IntegrationEPTypes.xsd | Тип: Реквизиты находящиеся на уровне требований заказчиков для ЭA 20 (аукцион в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `customerRequirementEMZType` | IntegrationEPTypes.xsd | Тип: Реквизиты находящиеся на уровне требований заказчиков для ЭМЗ (закупка у единственного поставщика по пункту 4, 5 части 1 статьи 93 Закона № 44-ФЗ) |
| `customerRequirementEOK2020Type` | IntegrationEPTypes.xsd | Тип: Реквизиты находящиеся на уровне требований заказчиков для ЭОК 20 открытый конкурс в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `customerRequirementEZakA2020Type` | IntegrationEPTypes.xsd | Тип: Реквизиты находящиеся на уровне требований заказчиков для ЭЗакА 20 закрытый аукцион в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `customerRequirementEZakK2020Type` | IntegrationEPTypes.xsd | Тип: Реквизиты находящиеся на уровне требований заказчиков для ЭЗакК 20 закрытый конкурс в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `customerRequirementEZK2020Type` | IntegrationEPTypes.xsd | Тип: Реквизиты находящиеся на уровне требований заказчиков для ЭЗК 20 (запрос котировок в электронной форме с 01.04.2021) |
| `customerRequirementEZKType` | IntegrationEPTypes.xsd | Тип: Реквизиты находящиеся на уровне требований заказчиков для ЭЗК (запрос котировок в электронной форме) |
| `customerRequirementEZPType` | IntegrationEPTypes.xsd | Тип: Реквизиты находящиеся на уровне требований заказчиков для ЭЗП (запрос предложений в электронной форме) |
| `customerRequirementEZT2020Type` | IntegrationEPTypes.xsd | Тип: Реквизиты находящиеся на уровне требований заказчиков для ЭЗТ (Закупка товаров согласно ч.12 ст. 93 № 44-ФЗ) |
| `customerRequirementType` | IntegrationEPTypes.xsd | Тип: Реквизиты, находящиеся на уровне требований заказчиков |
| `deliveryPlaceInfoType` | CommonTypes.xsd | Тип: Место поставки товара, выполнения работы или оказания услуги для указания в электронном контракте и сведениях о контракте |
| `deltaPrintFormInfoType` | CommonTypes.xsd | Тип: Печатная форма дельты доп.соглашения |
| `deltaType` | IntegrationCPTypes.xsd | Тип: Дельта доп.соглашения |
| `detailIndicatorScoreType` | IntegrationEPTypes.xsd | Тип: Оценка по детализирующему показателю |
| `deviationFactFoundationRef` | BaseTypes.xsd | Ссылка на справочник "Причины признания участника уклонившимся от заключения контракта" (nsiDeviationFactFoundation) |
| `dlCharacteristicsUsingReferenceInfo` | IntegrationCPTypes.xsd | Тип: Характеристика товара по справочнику (дельта) |
| `dlCharacteristicsUsingReferenceInfoValueType` | IntegrationCPTypes.xsd | Тип: Допустимое значение характеристики по справочнику (дельта) |
| `dlCharacteristicsUsingTextFormType` | IntegrationCPTypes.xsd | Тип: Характеристика товара в текстовой форме (дельта) |
| `dlCharacteristicsUsingTextFormValueType` | IntegrationCPTypes.xsd | Тип: Допустимое значение характеристики в текстовой форме (дельта) |
| `dlConstructionWorkGroupType` | IntegrationCPTypes.xsd | Тип: Группа работ по строительству (дельта) |
| `dlCriteriaProposalsInfoType` | IntegrationCPTypes.xsd | Тип: Предложения по критериям, предусмотренным пунктами 2 и (или) 3 части 1 статьи 32 Закона № 44-ФЗ (дельта) |
| `dlDetailIndicatorInfoType` | IntegrationCPTypes.xsd | Тип: Детализирующий показатель (дельта) |
| `dlDosageInfoType` | IntegrationCPTypes.xsd | Тип: Дозировка (дельта) |
| `dlIndicatorInfoType` | IntegrationCPTypes.xsd | Тип: Показатель критерия (дельта) |
| `dlKTRUInfoType` | IntegrationCPTypes.xsd | Тип: Классификация по КТРУ (дельта) |
| `dllContractTermsType` | IntegrationCPTypes.xsd | Тип: Структурированные типовые условия контракта в РЭК (дельта) |
| `dllContractTermType` | IntegrationCPTypes.xsd | Тип: Структурированное типовое условие контракта в РЭК (дельта) |
| `dlMNNInfoType` | IntegrationCPTypes.xsd | Тип: Международное, группировочное или химическое наименование лекарственного препарата (МНН), сформированное по справочнику (дельта) |
| `dlMNNInfoUsingTextFormType` | IntegrationCPTypes.xsd | Тип: Международное, группировочное или химическое наименование лекарственного препарата (МНН), сформированное в текстовой форме (дельта) |
| `dlOKEIInfoType` | IntegrationCPTypes.xsd | Тип: Единица измерения (дельта) |
| `dlOKPD2InfoType` | IntegrationCPTypes.xsd | Тип: Классификация по ОКПД2 (дельта) |
| `dlOutValueRangeType` | IntegrationCPTypes.xsd | Тип: Внешний диапазон значений (дельта) |
| `dlPaymentPropertysType` | CommonTypes.xsd | Тип: Платежные реквизиты |
| `dltradeInfoType` | IntegrationCPTypes.xsd | Тип: Торговое наименование (ТН) лекарственного препарата (дельта) |
| `dlTradeNameInfoType` | IntegrationCPTypes.xsd | Тип: Торговые наименования, сформированные с использованием справочной информации (дельта) |
| `dlTradeNamesInfoUsingTextFormType` | IntegrationCPTypes.xsd | Тип: Торговые наименования, сформированные в текстовой форме (дельта) |
| `dlValueRangeType` | IntegrationCPTypes.xsd | Тип: Диапазон значений (дельта) |
| `docIntInfoType` | CommonTypes.xsd | Тип: Информация о интеграционном документе |
| `docProjectStatusRequestType` | IntegrationSMTypes.xsd | Тип: Запрос информации о статусе размещения проектов документов |
| `docProjectStatusResponseType` | IntegrationSMTypes.xsd | Тип: Ответ на запрос о статусе размещения проектов документов |
| `docPropertyType` | CommonTypes.xsd | Тип: Реквизиты документа |
| `docRejectReasonRef` | BaseTypes.xsd | Ссылка на справочник "Причины для отказа в предоставлении документации о закупке" |
| `docSignInfoType` | CommonTypes.xsd | Тип: Информация о подписи |
| `docStoreInfoType` | CommonTypes.xsd | Тип: Идентификатор на хранилище документов |
| `docType` | CommonTypes.xsd | Тип: Тип документа в рамках закупки |
| `docType` | Integration615Types.xsd | Тип: Информация о типе документа в рамках закупки |
| `documentationOKType` | IntegrationEPTypes.xsd | Тип: Структурированная документация в рамках проведения конкурсов в электронной форме |
| `documentationZPType` | IntegrationEPTypes.xsd | Тип: Структурированная документация в рамках проведения запроса предложений в электронной форме |
| `documentKindRef` | BaseTypes.xsd | Ссылка на справочник "Виды прикреплённых документов" |
| `documentRequirementProtocolType` | IntegrationEPTypes.xsd | Тип: Информация и документы, предусмотренные конкурсной документацией указываемые в протоколе |
| `documentRequirementType` | IntegrationEPTypes.xsd | Тип: Информация и документы, предусмотренные конкурсной документацией |
| `documentTypeRef` | BaseTypes.xsd | Ссылка на справочник "Типы документов исполнения контракта" (nsiContractExecutionDoc) |
| `drugChangeInfoType` | CommonTypes.xsd | Тип: Информация, указываемая при ручном изменении лекарственного препарата |
| `drugChangeReasonRef` | BaseTypes.xsd | Ссылка на справочник "Причины корректировки справочных данных о лекарственных препаратах" (nsiDrugChangeReason) |
| `drugInfoEMZType` | CommonTypes.xsd | Тип: Сведения о МНН, ТН, лекарственной форме и дозировке (ЭМЗ) |
| `drugInfoType` | CommonTypes.xsd | Тип: Сведения о МНН, ТН, лекарственной форме и дозировке |
| `drugInfoUsingTextFormType` | CommonTypes.xsd | Тип: Сведения о МНН, ТН, лекарственной форме и дозировке в случае когда информация о лекарственных препаратах формируется в текстовой форме |
| `drugInterchangeManualInfoType` | CommonTypes.xsd | Тип: Сведения о лекарственных препаратах с учетом взаимозаменяемости, своя группа |
| `drugInterchangeReferenceInfoEMZType` | CommonTypes.xsd | Тип: Сведения о лекарственных препаратах с учетом взаимозаменяемости для ЭМЗ |
| `drugInterchangeReferenceInfoEZTType` | CommonTypes.xsd | Тип: Сведения о лекарственных препаратах с учетом взаимозаменяемости для ЭЗТ2020 |
| `drugInterchangeReferenceInfoType` | CommonTypes.xsd | Тип: Сведения о лекарственных препаратах с учетом взаимозаменяемости |
| `drugInterchangeTextFormInfoType` | CommonTypes.xsd | Тип: Сведения о лекарственных препаратах с учетом взаимозаменяемости, своя группа в текстовой форме |
| `drugProductInfoElectronicContractType` | CommonTypes.xsd | Тип: Сведения об объектах закупки в том случае, когда объектами закупки являются лекарственные препараты (РЭК) |
| `drugProductInfoFinalProtocolEMZType` | IntegrationEPTypes.xsd | Тип: Сведения об объектах закупки в том случае, когда объектами закупки являются лекарственные препараты (итоговый протокол) (ЭМЗ) |
| `drugProductInfoFinalProtocolType` | IntegrationEPTypes.xsd | Тип: Сведения об объектах закупки в том случае, когда объектами закупки являются лекарственные препараты (итоговый протокол) |
| `drugProductsInfoElectronicAdditionalType` | IntegrationCPTypes.xsd | Тип: Лекарственные объекты закупки в электронном доп.соглашении |
| `drugProductsInfoElectronicContractType` | IntegrationCPTypes.xsd | Тип: Лекарственные объекты закупки в электронном контракте |
| `drugProposalsInfoEMZType` | IntegrationEPTypes.xsd | Тип: Лекарственные объекты закупки (предложения) в итоговом протоколе (ЭМЗ) |
| `drugProposalsInfoType` | IntegrationEPTypes.xsd | Тип: Лекарственные объекты закупки (предложения) в итоговом протоколе |
| `EADocTypeRef` | BaseTypes.xsd | Ссылка на справочник "Виды документов электронного актирования" |
| `ecRegistrationNumbersInfoType` | CommonTypes.xsd | Тип: Реестровые номера для электронного контракта |
| `EGRIPInfoType` | CommonTypes.xsd | Тип: Сведения из ЕГРИП |
| `EGRULInfoType` | CommonTypes.xsd | Тип: Сведения из ЕГРЮЛ |
| `EKKTRef` | BaseTypes.xsd | Тип: Ссылка на Единый каталог конкретных товаров (ЕККТ) |
| `elActSpendingFundsInfoType` | IntegrationEATypes.xsd | Тип: Сведения о направлениях расходования средств |
| `elActUnstructuredCustomerTitleType` | IntegrationEATypes.xsd | Тип: Документ о приемке в неструктурированной форме (информация заказчика) |
| `elActUnstructuredSupplierTitleType` | IntegrationEATypes.xsd | Тип: Документ о приемке в неструктурированной форме (информация поставщика) |
| `electronicComplaint` | eisSignIncoming.xsd | Пакет данных:Информация по жалобе, поданной в электронном виде для ИС КО. Прием пакета не осуществляется, начиная с версии 15.3 |
| `electronicContractCRKType` | IntegrationCPTypes.xsd | Тип: Информация о заключенном электронном контракте в целевом реестре контрактов (ЦРК) |
| `electronicContractFilesSignType` | IntegrationCPTypes.xsd | Тип: Файлы проекта электронного контракта, подписанные поставщиком |
| `electronicContractInfoType` | CommonTypes.xsd | Тип: Проект электронного контракта в структурированной форме |
| `electronicContractType` | IntegrationCPTypes.xsd | Тип: Электронный контракт |
| `electronicCPInfoType` | CommonTypes.xsd | Тип: Информация о электронном контракте по ед.поставщику |
| `electronicProjectSignInfoType` | CommonTypes.xsd | Тип: Проект электронного контракта в структурированной форме (без блока печатная форма в HTML-представлении) |
| `EMRef` | BaseTypes.xsd | Ссылка на справочник "Электронные торговые площадки для ЭМЗ" |
| `enforcementType` | CommonTypes.xsd | Тип: Обеспечение исполнения контракта |
| `errorInfoType` | CommonTypes.xsd | Тип: Результат вызова сервиса в случае ошибки |
| `errorInfoType` | docs-https-api.xsd | Тип: Результат вызова сервиса в случае ошибки |
| `errorInfoType` | docs-ws-api.xsd | Тип: Результат вызова сервиса в случае ошибки |
| `errorInfoType` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Тип: Результат вызова сервиса в случае ошибки |
| `errorInfoType` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Тип: Результат вызова сервиса в случае ошибки |
| `errorInfoType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Результат вызова сервиса в случае ошибки |
| `errorInfoType` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Тип: Результат вызова сервиса в случае ошибки |
| `errorInfoType` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Тип: Результат вызова сервиса в случае ошибки |
| `errorInfoType` | QueueVBS\queue-vbs-ws-api.xsd | Тип: Результат вызова сервиса в случае ошибки |
| `errorInfoType` | queue-ws-api.xsd | Тип: Результат вызова сервиса в случае ошибки |
| `errorType` | eis-fs-ws-api.xsd | Тип: Ошибка |
| `errorWarningConfirmEMZType` | IntegrationEPTypes.xsd | Тип: Ошибка(предупреждение) в результате обработки (ЭМЗ) |
| `etpOperatorType` | CommonTypes.xsd | Тип: Ссылка на ЭТП с учетом справочника ЭТП |
| `ETPRef` | BaseTypes.xsd | Ссылка на справочник "Электронные площадки" (nsiETP) |
| `evasDevFactFoundationRef` | BaseTypes.xsd | Ссылка на справочник "Основания отказа (принятия решения) для ПОК и ППУ с 01.01.2021" |
| `eventPlan` | eisSignIncoming.xsd | Пакет данных: План контрольных мероприятий для ИС ОВК |
| `eventPlanProject` | eisSignIncoming.xsd | Пакет данных: Проект плана контрольных мероприятий для ИС ОВК |
| `eventPlanSuspension` | eisSignIncoming.xsd | Информации о приостановке/возобновлении планового контрольного мероприятия |
| `eventResult` | eisSignIncoming.xsd | Пакет данных: Результат контроля для ИС ОВК |
| `eventResultCancel` | eisSignIncoming.xsd | Пакет данных:Информация об отмене результата контроля для ИС ОВК |
| `eventResultCancelProject` | eisSignIncoming.xsd | Пакет данных:Проект информации об отмене результата контроля для ИС ОВК |
| `eventResultProject` | eisSignIncoming.xsd | Пакет данных: Проект результата контроля для ИС ОВК |
| `exclusionReason615Ref` | BaseTypes.xsd | Ссылка на справочник Справочник оснований для исключения сведений из реестра квалифицированных подрядных организаций" |
| `expirationDateCustomFormatType` | CommonTypes.xsd | Тип: Срок годности в пользовательском формате |
| `extPrintFormEMZType` | CommonTypes.xsd | Тип: Электронный документ, полученный из внешней системы (ЭМЗ) |
| `extPrintFormMZType` | CommonTypes.xsd | Тип: Электронный документ, полученный из внешней системы (ЭМЗ) |
| `extPrintFormProtocolType` | CommonTypes.xsd | Тип: Электронный документ, полученный из внешней системы |
| `extPrintFormType` | CommonTypes.xsd | Тип: Электронный документ, полученный из внешней системы |
| `extPrintFormType` | Integration615Types.xsd | Тип: Электронный документ, полученный из внешней системы |
| `extraBudgetFundsContract` | CommonTypes.xsd | Тип: Код и наименование вида внебюджетных средств в контракте |
| `failedProcedurePPRF916Ref` | BaseTypes.xsd | Ссылка на справочник "Несостоявшиеся процедуры по ПП РФ 961" (NSI_FAILED_PROCEDURE_PP_RF_916) |
| `fcsClarificationRequestInfoType` | fcsPrintForm.xsd | fcsClarificationRequestInfo |
| `fcsClarificationType` | fcsPrintForm.xsd | fcsClarification |
| `fcsPurchaseDocumentCancelType` | fcsPrintForm.xsd | fcsPurchaseDocumentCancel |
| `fcsPurchaseDocumentType` | fcsPrintForm.xsd | fcsPurchaseDocument |
| `fileRowAttrsType` | IntegrationCPTypes.xsd | Тип: Файл. Тип с атрибутами по строкам |
| `fileType` | IntegrationCPTypes.xsd | Тип: Файл. Базовый тип |
| `financeResourcesType` | CommonTypes.xsd | Тип: Финансовое обеспечение закупки |
| `financeResourcesType` | IntegrationEPTypes.xsd | Тип: Финансовое обеспечение закупки |
| `financingSourcesInfoType` | IntegrationEPTypes.xsd | Тип: Информация об источниках финансирования |
| `fineReasonType` | BaseTypes.xsd | Ссылка на справочник "Основания для начисления штрафов" (nsiFineReasons) |
| `finishRequestPacketType` | eis-fs-ws-api.xsd | Тип для пакета данных: Запрос на завершение сессии передачи файла |
| `finishRequestType` | eis-fs-ws-api.xsd | Тип: Запрос на завершение сессии передачи файла |
| `finishResponsePacketType` | eis-fs-ws-api.xsd | Тип для пакета данных: Ответ на завершение сессии передачи файла |
| `finishResponseType` | eis-fs-ws-api.xsd | Тип: Ответ на завершение сессии передачи файла |
| `foundationContractProjectInfoType` | CommonTypes.xsd | Тип: Основание заключения контракта с единственным поставщиком |
| `foundationContractProjectOutsideInfoType` | IntegrationCPTypes.xsd | Тип: Основание заключения контракта с единственным поставщиком "с улицы" |
| `foundationDocInfoType` | IntegrationEPTypes.xsd | Тип: Документ-основание |
| `fundingSources615Ref` | BaseTypes.xsd | Ссылка на справочник Типы источников финансирования ПП РФ № 615 |
| `GARType` | CommonTypes.xsd | Тип: Сведения из ГАР |
| `getDocsByOrgRegionRequestType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Запрос формирования в ХД архивов с документами по региону заказчика и типу документа |
| `getDocsByOrgRegionResponseType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Ответ на запрос формирования в ХД архивов с документами по региону заказчика и типу документа |
| `getDocsByReestrNumberRequestType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Запрос формирования в ХД архивов с документами по реестровому номеру |
| `getDocsByReestrNumberRequestType` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Тип: Запрос формирования в ХД архивов с документами по реестровому номеру |
| `getDocsByReestrNumberRequestType` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Тип: Запрос формирования в ХД архивов с документами по реестровому номеру |
| `getDocsByReestrNumberResponseType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Ответ на запрос формирования в ХД архивов с документами по реестровому номеру |
| `getDocsByReestrNumberResponseType` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Тип: Ответ на запрос формирования в ХД архивов с документами по реестровому номеру |
| `getDocsByReestrNumberResponseType` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Тип: Ответ на запрос формирования в ХД архивов с документами по реестровому номеру |
| `getDocsOrgRequestType` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Тип: Запрос формирования в ХД архивов с документами по набору параметров |
| `getDocsOrgResponseType` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Тип: Ответ на запрос формирования в ХД архивов с документами по набору параметров |
| `getDocsParticularRequestType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Запрос на получение архивов с документами по специфическому набору параметров |
| `getDocsParticularResponseType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Ответ на запрос получения архивов с документами по специфическому набору параметров |
| `getDocsRequestType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Запрос формирования в ХД архивов с документами по набору параметров |
| `getDocsResponseType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Ответ на запрос формирования в ХД архивов с документами по набору параметров |
| `getDocsRisRequestType` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Тип: Запрос формирования в ХД архивов с документами по набору параметров |
| `getDocsRisResponseType` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Тип: Ответ на запрос формирования в ХД архивов с документами по набору параметров |
| `getObjectListRequest` | docs-https-api.xsd | Тип: Общие поля запроса сведений о документах |
| `getPreparedArchivesRequestType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Запрос на получение предподготовленных архивов с документами |
| `getPreparedArchivesResponseType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Ответ на запрос получения предподготовленных архивов с документами |
| `getProcessingResultRequestType` | eisSigningSOAPMessages.xsd | Тип: Запрос результата приёма документа |
| `guaranteeInfoElectronicContractType` | IntegrationCPTypes.xsd | Тип: Обеспечение исполнения контракта в электронном контракте |
| `indexRequestType` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Тип: Индексная карточка пакета данных |
| `indexRequestType` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Тип: Индексная карточка пакета данных |
| `indexRequestType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Индексная карточка пакета данных |
| `indexRequestType` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Тип: Индексная карточка пакета данных |
| `indexRequestType` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Тип: Индексная карточка пакета данных |
| `indexResponseType` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Тип: Индексная карточка пакета данных |
| `indexResponseType` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Тип: Индексная карточка пакета данных |
| `indexResponseType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Индексная карточка пакета данных |
| `indexResponseType` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Тип: Индексная карточка пакета данных |
| `indexResponseType` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Тип: Индексная карточка пакета данных |
| `indexType` | QueueVBS\queue-vbs-ws-api.xsd | Тип: Индексная карточка пакета данных |
| `indexType` | queue-ws-api.xsd | Тип: Индексная карточка пакета данных |
| `indicatorDocOKType` | IntegrationEPTypes.xsd | Тип: Показатель критерия оценки в рамках проведения конкурсов в электронной форме |
| `indicatorDocZPType` | IntegrationEPTypes.xsd | Тип: Показатель критерия оценки в рамках проведения запроса предложений в электронной форме |
| `indicatorInfoType` | IntegrationEPTypes.xsd | Тип: Показатель критерия оценки для кода критерия "MC" |
| `indicatorProtocolOKType` | IntegrationEPTypes.xsd | Тип: Показатель критерия оценки в протоколе в рамках проведения конкурсов в электронной форме |
| `indicatorProtocolZPType` | IntegrationEPTypes.xsd | Тип: Показатель критерия оценки в протоколе в рамках проведения запроса предложений в электронной форме |
| `indicatorScoreType` | IntegrationEPTypes.xsd | Тип: Оценка по показателю критери оценки для кода критерия "MC" |
| `individualPersonType` | Integration615Types.xsd | Тип: Индивидуальный предприниматель |
| `inFileStorageType` | IntegrationSMTypes.xsd | Тип: Файл или часть файла для передачи в файловое хранилище |
| `invitationEZakA2020Type` | IntegrationEPTypes.xsd | Тип: Приглашение принять участие в закупке ЭЗакА20 (закрытый аукцион в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ); изменение приглашения |
| `invitationEZakK2020Type` | IntegrationEPTypes.xsd | Тип: Приглашение принять участие в закупке ЭЗакК20 (закрытый конкурс в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ); изменение приглашения |
| `invitationType` | IntegrationEPTypes.xsd | Тип: Общие поля приглашения |
| `ipForeignInfoType` | CommonTypes.xsd | Тип: Данные иностранного ФЛ |
| `ipInfoType` | CommonTypes.xsd | Тип: Данные ФЛ |
| `kladrPlaceType` | Integration615Types.xsd | Тип: Место доставки ТРУ по КЛАДР |
| `kladrPlaceType` | IntegrationEPTypes.xsd | Тип: Место доставки ТРУ по КЛАДР |
| `kladrPlaceType` | IntegrationKOTypes.xsd | Тип: Место рассмотрения жалобы |
| `kladrType` | Integration615Types.xsd | Тип: Адрес по КЛАДР |
| `kladrType` | IntegrationEPTypes.xsd | Тип: Адрес по КЛАДР |
| `kladrType` | IntegrationKOTypes.xsd | Тип: Адрес по КЛАДР |
| `KOKSFinancingsMandatoryYearType` | CommonTypes.xsd | Тип: Детализация по кодам объектов капитального строительства/недвижимого имущества (кодам ОКС/ОНИ) с обязательным текущим плановым годом |
| `KOKSFinancingsType` | CommonTypes.xsd | Тип: Детализация по кодам объектов капитального строительства/недвижимого имущества (кодам ОКС/ОНИ) |
| `KOKSFinancingType` | CommonTypes.xsd | Тип: Детализация по коду объекта капитального строительства/недвижимого имущества (коду ОКС/ОНИ) |
| `KOKSRef` | BaseTypes.xsd | Ссылка на справочник "Классификатор объектов капитального строительства" (КОКС) |
| `KOSOReasonType` | IntegrationEPTypes.xsd | Тип: Основание КО/СО |
| `KTRUCharacteristicValueTextFormType` | CommonTypes.xsd | Тип КТРУ: Значение характеристики позиции КТРУ для ввода в текстовой форме |
| `KTRUCharacteristicValueType` | CommonTypes.xsd | Тип КТРУ: Значение характеристики позиции КТРУ |
| `KTRUCharacteristicValueWithSidsType` | CommonTypes.xsd | Тип КТРУ: Значение характеристики позиции КТРУ с идентификаторами |
| `KTRURef` | BaseTypes.xsd | Тип: Ссылка на КТРУ |
| `KVRCRFinancingsMandatoryYearType` | CommonTypes.xsd | Тип: Детализация по кодам КВР и КП с обязательным текущим плановым годом |
| `KVRCRFinancingType` | CommonTypes.xsd | Тип: Детализация по коду КВР и КП |
| `KVRFinancingsMandatoryYearType` | CommonTypes.xsd | Тип: Детализация по кодам КВР с обязательным текущим плановым годом |
| `KVRFinancingsType` | CommonTypes.xsd | Тип: Детализация по кодам КВР |
| `KVRFinancingType` | CommonTypes.xsd | Тип: Детализация по коду КВР |
| `KVRRef` | BaseTypes.xsd | Ссылка на справочник "Коды видов расходов" (КВР) (nsiKVR) |
| `legalEntityForeignStateType` | Integration615Types.xsd | Тип: Юридическое лицо иностранного государства |
| `legalEntityRFInfoType` | IntegrationKOTypes.xsd | Тип: Сведения о юридическом лице РФ |
| `legalEntityRFType` | Integration615Types.xsd | Тип: Юридическое лицо РФ |
| `legalForeignInfoType` | CommonTypes.xsd | Тип: Данные иностранного ЮЛ |
| `legalRFInfoType` | CommonTypes.xsd | Тип: Данные ЮЛ (Наименование, ИНН, КПП, Адрес) |
| `lkpPrintFormType` | CommonTypes.xsd | Тип: Электронный документ, полученный из ЛКП |
| `locCatalogRef` | BaseTypes.xsd | Тип: Ссылка на локальный каталог |
| `manualCharacteristicValueWithSidsType` | CommonTypes.xsd | Тип: Значение характеристики с идентификаторами для ввода в текстовой форме |
| `manualCharacteristicWithSidsType` | CommonTypes.xsd | Тип: Характеристика позиции с идентификаторами для ввода в текстовой форме |
| `manualKTRUCharacteristicType` | CommonTypes.xsd | Тип КТРУ: Характеристика товаров, работ, услуг для ввода в текстовой форме |
| `manualKTRUCharacteristicValueType` | CommonTypes.xsd | Тип КТРУ: Значение характеристики позиции КТРУ в текстовой форме |
| `manualOKPD2CharacteristicType` | CommonTypes.xsd | Тип ОКПД2: Характеристика товаров, работ, услуг для ввода в текстовой форме |
| `manualOKPD2CharacteristicValueType` | CommonTypes.xsd | Тип ОКПД2: Значение характеристики позиции КТРУ в текстовой форме |
| `manualProtocolCharacteristicType` | IntegrationEPTypes.xsd | Тип: Характеристика позиции в итоговом протоколе для ввода в текстовой форме |
| `manualProtocolCharacteristicValueTextFormType` | IntegrationEPTypes.xsd | Тип: Значение характеристики позиции в итоговом протоколе, которое связано со значением характеристики в извещении, для ввода в текстовой форме |
| `manualProtocolCharacteristicValueType` | IntegrationEPTypes.xsd | Тип: Значение характеристики позиции в итоговом протоколе для ввода в текстовой форме |
| `manualProtocolCharacteristicWithSidsType` | IntegrationEPTypes.xsd | Тип: Характеристика позиции в итоговом протоколе для ввода в текстовой форме, которая связана с характеристикой позиции в извещении |
| `manualRightSideKTRUCharacteristicType` | CommonTypes.xsd | Тип ПЧ КТРУ: Характеристика товаров, работ, услуг для ввода в текстовой форме |
| `manufacturerInfoType` | CommonTypes.xsd | Тип: Производитель лекарственного препарата |
| `masterDataType` | Integration615Types.xsd | Набор элементов справочников и классификаторов по ПП РФ № 615 |
| `maxPriceCurrencyType` | IntegrationEPTypes.xsd | Тип: НМЦК в валюте контракта |
| `maxPriceInfoType` | IntegrationEPTypes.xsd | Тип: Информация о начальной (максимальной) цене контракта |
| `medicamentalFormRef` | BaseTypes.xsd | Ссылка на справочник "Лекарственные формы" |
| `minRusRejectReasonRef` | BaseTypes.xsd | Ссылка на справочник Причины невозможности достижения минимальной обязательной доли закупок |
| `MNNInfoType` | CommonTypes.xsd | Тип: Международное, группировочное или химическое наименование лекарственного препарата (МНН) |
| `MNNInfoUsingTextFormType` | CommonTypes.xsd | Тип: Международное, группировочное или химическое наименование лекарственного препарата (МНН), сформированное в текстовой форме |
| `moCommonType` | QueueVBS\IntegrationVBSTypes.xsd | Тип: Сведения о денежном обязательстве (ДО). Общий тип |
| `moDeniedRegistrationType` | QueueVBS\IntegrationVBSTypes.xsd | Тип: Сведения о денежном обязательстве (ДО), отказанные в постановке на учет |
| `modificationReasonCauseRef` | BaseTypes.xsd | Ссылка на справочник "Причина изменений условий контракта" |
| `modificationReasonDocRef` | BaseTypes.xsd | Ссылка на справочник "Документы, являющиеся основанием изменения условий контракта" |
| `modificationType` | IntegrationCPTypes.xsd | Тип: Основание внесения изменений в контракт |
| `modificationType` | IntegrationEPTypes.xsd | Тип: Внесение исправлений в документ закупки |
| `modificationWithoutCustomerDecisionType` | IntegrationEPTypes.xsd | Тип: Внесение исправлений в документ закупки без изменений на основании решения заказчика |
| `moProjectType` | QueueVBS\IntegrationVBSTypes.xsd | Тип: Проект сведений о денежном обязательстве (ДО) |
| `moRegistredType` | QueueVBS\IntegrationVBSTypes.xsd | Тип: Сведения о денежном обязательстве (ДО), поставленные на учет |
| `moSentForVerificationType` | QueueVBS\IntegrationVBSTypes.xsd | Тип: Сведения о денежном обязательстве (ДО), направленные на проверку в ТОФК |
| `mzMasterDataType` | IntegrationSMTypes.xsd | Тип: Набор элементов справочников и классификаторов (МЗ) |
| `nondisclosureAgreementType` | IntegrationPFTypes.xsd | Уведомление о неразглашении сведений |
| `notDrugProposalsEMZInfoType` | IntegrationEPTypes.xsd | Тип: Объекты закупки (предложения) в итоговом протоколе (ЭМЗ) |
| `notDrugProposalsInfoType` | IntegrationEPTypes.xsd | Тип: Объекты закупки (предложения) в итоговом протоколе |
| `noticeApplicationCancelType` | IntegrationEPTypes.xsd | Тип: Уведомление об отзыве заявки участником |
| `noticeApplicationsAbsenceType` | IntegrationEPTypes.xsd | Тип: Уведомление об отсутствии заявок |
| `noticeCommonType` | IntegrationCPTypes.xsd | Тип: Общий тип для уведомлений |
| `noticeDeviationType` | IntegrationCPTypes.xsd | Тип: Уведомление об уклонении от заключения контракта |
| `noticeEvasionType` | IntegrationCPTypes.xsd | Тип: Уведомление об отказе от заключения контракта. Устарело, не применяется |
| `noticeType` | IntegrationKOTypes.xsd | Тип: Уведомление о наступлении в ЕИС события, которое связано с жалобой, сформированной в ЛКП |
| `notification2020ChangeReasonType` | IntegrationEPTypes.xsd | Тип: Основание внесения изменений в извещение с даты начала действия оптимизационного законопроекта 44-ФЗ |
| `notification2020CommonInfoType` | IntegrationEPTypes.xsd | Тип: Общая информация о извещении с даты начала действия оптимизационного законопроекта 44-ФЗ |
| `notification2020ModificationType` | IntegrationEPTypes.xsd | Тип: Внесение исправлений в извещение с даты начала действия оптимизационного законопроекта 44-ФЗ |
| `notification2020Type` | IntegrationEPTypes.xsd | Тип: Общие поля извещений с даты начала действия оптимизационного законопроекта 44-ФЗ |
| `notificationCancelFailureType` | IntegrationEPTypes.xsd | Тип: Отмена извещения об отмене определения поставщика (подрядчика, исполнителя) |
| `notificationCancelType` | Integration615Types.xsd | Извещение об отказе от проведения закупки |
| `notificationCancelType` | IntegrationEPTypes.xsd | Тип: Извещение об отмене определения поставщика (подрядчика, исполнителя) |
| `notificationChangeReasonType` | IntegrationEPTypes.xsd | Тип: Основание внесения изменений в извещение |
| `notificationCommonInfoType` | Integration615Types.xsd | Тип: Общая информация о извещении |
| `notificationCommonInfoType` | IntegrationEPTypes.xsd | Тип: Общая информация о извещении |
| `notificationEF2020Type` | IntegrationEPTypes.xsd | Тип: Извещение о проведении ЭА20 (аукцион в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ); изменение извещения |
| `notificationEFInfoType` | Integration615Types.xsd | Тип: Информация о закупке ЭА (электронный аукцион) |
| `notificationEFType` | Integration615Types.xsd | Извещение о проведении ЭА (электронный аукцион); внесение изменений |
| `notificationEMZ2025Type` | IntegrationEPTypes.xsd | Тип: Извещение о проведении ЭЗМ( Закупка у единственного поставщика по пункту 4, 5 части 1 статьи 93 Закона № 44-ФЗ) |
| `notificationEMZCommonInfoType` | IntegrationEPTypes.xsd | Тип: Общая информация о извещении с даты начала действия оптимизационного законопроекта 44-ФЗ |
| `notificationEMZType` | IntegrationEPTypes.xsd | Тип: Общие поля извещений для ЭЗМ |
| `notificationEOK2020Type` | IntegrationEPTypes.xsd | Тип: Извещение о проведении ЭОК20 (открытый конкурс в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ); изменение извещения |
| `notificationEOKDPFType` | IntegrationEPTypes.xsd | Тип: Извещение о проведении ЭOKД (двухэтапный конкурс в электронной форме) для печатной формы Извещения |
| `notificationEOKDType` | IntegrationEPTypes.xsd | Тип: Извещение о проведении ЭOKД (двухэтапный конкурс в электронной форме) с конкурсной документацией; внесение изменений |
| `notificationEOKOUPFType` | IntegrationEPTypes.xsd | Тип: Извещение о проведении ЭOK-ОУ (открытый конкурс с ограниченным участием в электронной форме) для печатной формы Извещения |
| `notificationEOKOUType` | IntegrationEPTypes.xsd | Тип: Извещение о проведении ЭOK-ОУ (открытый конкурс с ограниченным участием в электронной форме) с конкурсной документацией; внесение изменений |
| `notificationEOKPFType` | IntegrationEPTypes.xsd | Тип: Извещение о проведении ЭOK (открытый конкурс в электронной форме) для печатной формы Извещения |
| `notificationEOKType` | IntegrationEPTypes.xsd | Тип: Извещение о проведении ЭOK (открытый конкурс в электронной форме) с конкурсной документацией; внесение изменений |
| `notificationEZakAType` | IntegrationEPTypes.xsd | Тип: Извещение о проведении закрытого аукциона в электронном виде (ЭЗакА); внесение изменений |
| `notificationEZakKDType` | IntegrationEPTypes.xsd | Тип: Извещение о проведении двухэтапного закрытого конкурса в электронном виде (ЭЗакКД); внесение изменений |
| `notificationEZakKOUType` | IntegrationEPTypes.xsd | Тип: Извещение о проведении закрытого конкурса с ограниченным участием в электронном виде (ЭЗакК-ОУ); внесение изменений |
| `notificationEZakKType` | IntegrationEPTypes.xsd | Тип: Извещение о проведении закрытого конкурса в электронном виде (ЭЗакК); внесение изменений |
| `notificationEZK2020Type` | IntegrationEPTypes.xsd | Тип: Извещение о проведении ЭЗК20 (запрос котировок в электронной форме с 01.04.2021 года); изменение извещения |
| `notificationEZKType` | IntegrationEPTypes.xsd | Тип: Извещение о проведении ЭЗК (запрос котировок в электронной форме); изменение извещения |
| `notificationEZPPFType` | IntegrationEPTypes.xsd | Тип: Извещение о проведении ЭЗП (запрос предложений в электронной форме) для печатной формы Извещения |
| `notificationEZPType` | IntegrationEPTypes.xsd | Тип: Извещение о проведении ЭЗП (запрос предложений в электронной форме) с конкурсной документацией; внесение изменений |
| `notificationEZT2020Type` | IntegrationEPTypes.xsd | Тип: Извещение о проведении ЭЗТ (закупка товаров согласно ч.12 ст. 93 № 44-ФЗ); изменение извещения |
| `notificationMFOType` | IntegrationEPTypes.xsd | Тип: Извещение о закупке в рамках российских проектов, финансируемых за счет средств займов МФО |
| `notificationModificationType` | IntegrationEPTypes.xsd | Тип: Внесение исправлений в извещение |
| `notificationPOInfoType` | Integration615Types.xsd | Тип: Информация о закупке ПО (предварительный отбор) |
| `notificationPOType` | Integration615Types.xsd | Извещение о проведении ПО (предварительный отбор); внесение изменений |
| `notificationType` | IntegrationEPTypes.xsd | Тип: Общие поля извещений |
| `NPASt14Ref` | BaseTypes.xsd | Ссылка на справочник" Нормативно-правовые акты, регулирующие допуск товаров, работ, услуг в соответствии со ст.14 Закона 44-ФЗ" |
| `nrgEventInfoType` | IntegrationSMTypes.xsd | Тип: Сведения о событии, необходимые для формирования регулярного сообщения |
| `nsiBusinessControl` | eisSignIncoming.xsd | Пакет данных:Правила бизнес-контролей |
| `nsiCustomerUserType` | IntegrationSMTypes.xsd | Тип: Сведения о пользователях Заказчика |
| `nsiEATaxesRef` | BaseTypes.xsd | Ссылка на справочник "Налоги и взносы" |
| `nsiExclusionReasonType` | Integration615Types.xsd | Справочник: Основания для исключения сведений из реестра квалифицированных подрядных организаций |
| `nsiFundingSourcesType` | Integration615Types.xsd | Справочник: Типы источников финансирования |
| `nsiParticipantUserType` | IntegrationSMTypes.xsd | Тип: Сведения о пользователях Поставщика |
| `nsiPurchaseSubjectType` | Integration615Types.xsd | Справочник: Предметы электронного аукциона по ПП РФ № 615 |
| `nsiTerminationGroundType` | Integration615Types.xsd | Справочник: Основания расторжения договора по капитальному ремонту ПП РФ № 615 |
| `nsiTerminationReasonProductType` | Integration615Types.xsd | Справочник: Причины расторжения договора на поставку товаров ПП РФ № 615 |
| `nsiTerminationReasonType` | Integration615Types.xsd | Справочник: Причины расторжения договора по капитальному ремонту ПП РФ № 615 |
| `nsiURDocTypesRef` | CommonTypes.xsd | Тип: Ссылка на справочник "Типы документов одностороннего отказа и претензионной переписки по результатам электронных процедур" (nsiURDocTypes) |
| `nsiWorkTypesType` | Integration615Types.xsd | Справочник: Виды работ по капитальному ремонту ПП РФ № 615 |
| `objectContentType` | docs-ws-api.xsd | Тип: Краткие сведения об опубликованном документе с контентом |
| `objectIndexType` | queue-ws-api.xsd | Тип: Индексная карточка объекта |
| `objectInfoRequestType` | docs-ws-api.xsd | Тип: Запрос сведения о размещённых документах |
| `objectInfoType` | docs-ws-api.xsd | Тип: Краткие сведения об опубликованном документе |
| `OKEIRef` | BaseTypes.xsd | Ссылка на справочник "Общероссийский классификатор единиц измерения" (ОКЕИ) |
| `OKFSRef` | BaseTypes.xsd | Ссылка на справочник "Общероссийский классификатор стран мира" (ОКФС) |
| `OKOGURef` | BaseTypes.xsd | Ссылка на справочник "Общероссийский классификатор органов государственной власти и управления" (ОКОГУ) |
| `OKOPFRef` | BaseTypes.xsd | Ссылка на справочник "Общероссийский классификатор организационно-правовых форм" (ОКОПФ) |
| `okopfType` | IntegrationTypes.xsd |  |
| `OKPD2Ref` | BaseTypes.xsd | Ссылка на справочник "Общероссийский классификатор продукции по видам экономической деятельности" (ОКПД2) |
| `OKPORef` | BaseTypes.xsd | Ссылка на ОКПО |
| `OKSMRef` | BaseTypes.xsd | Ссылка на справочник "Общероссийский классификатор стран мира" (ОКСМ) |
| `OKTMOPPORef` | BaseTypes.xsd | Ссылка на справочник "Публично-правовые образования" (ОКТМО ППО) (ZAKUPKI_DEV.NSI_PPO) |
| `OKTMORef` | BaseTypes.xsd | Ссылка на справочник "Общероссийский классификатор территорий муниципальных образований" (ОКТМО) |
| `orderEvalIndicatorsRef` | BaseTypes.xsd | Ссылка на справочник "Порядок оценки по показателю" (nsiOrderEvalIndicators) |
| `organization223WSRef` | BaseTypes.xsd | Ссылка на организацию 223-ФЗ при запросе в ЕИС документов через WS |
| `organizationForReportMeasureType` | CommonTypes.xsd | Тип: Сведения об организации для отчетов о проведенных мероприятиях |
| `organizationInfo223Type` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Информация об организации 223ФЗ |
| `organizationInfo44Type` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Информация об организации 44ФЗ |
| `organizationInfoType` | IntegrationKOTypes.xsd | Тип: Сведения об организации |
| `organizationOptionalRegNumType` | CommonTypes.xsd | Тип: Данные организации c необязательным полем "Код по СПЗ" (regNum) |
| `organizationRef` | BaseTypes.xsd | Ссылка на организацию |
| `organizationRefType` | CommonTypes.xsd | Тип: Ссылка на организацию |
| `organizationShortInfoType` | IntegrationKOTypes.xsd | Тип: Краткие сведения об организации |
| `organizationType` | CommonTypes.xsd | Тип: Данные организации |
| `organizationType` | IntegrationEPTypes.xsd | Тип: Данные организации |
| `organizationWithoutOblType` | CommonTypes.xsd | Тип: Данные организации без обязательности |
| `organizationWSRef` | BaseTypes.xsd | Ссылка на организацию при запросе в ЕИС документов через WS |
| `orgCustomerType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Информация о заказчике для запроса по ИНН, КПП |
| `orgSupplierType` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Тип: Организация поставщика |
| `orgSupplierType` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Тип: Организация поставщика |
| `orgSupplierType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Информация о поставщике для запроса по ИНН, КПП |
| `packageListRequestType` | IntegrationSMTypes.xsd | Тип: Запрос списка пакетов |
| `packageListType` | IntegrationSMTypes.xsd | Тип: Ответ на запрос списка переданных/полученных пакетов |
| `packagingInfoType` | CommonTypes.xsd | Тип: Сведения об упаковке |
| `packetType` | eis-fs-ws-api.xsd | Информационный пакет запроса |
| `packetType` | eisSignIncoming.xsd | Информационный пакет |
| `parClaimsCorrespondenceNoticeType` | IntegrationURTypes.xsd | Тип: Уведомление в рамках претензионной переписки, сформированное поставщиком |
| `parContractProcedureUnilateralRefusalCancelType` | IntegrationURTypes.xsd | Тип: Извещение об отмене решения об одностороннем отказе от исполнения контракта, сформированное поставщиком |
| `parContractProcedureUnilateralRefusalType` | IntegrationURTypes.xsd | Тип: Решение об одностороннем отказе от исполнения контракта, сформированное поставщиком |
| `parElectronicComplaintAccept` | eisSignIncoming.xsd | Пакет данных:Информация о принятии к рассмотрению электронной жалобы, сформированной в ЛКП |
| `parElectronicComplaintAcceptType` | IntegrationKOTypes.xsd | Тип: Информация о принятии к рассмотрению электронной жалобы, сформированной в ЛКП |
| `parElectronicComplaintCancelType` | IntegrationKOTypes.xsd | Тип: Информация об отзыве электронной жалобы, сформированной в ЛКП |
| `parElectronicComplaintRefusal` | eisSignIncoming.xsd | Пакет данных:Информация об отказе в рассмотрении электронной жалобы, сформированной в ЛКП |
| `parElectronicComplaintRefusalType` | IntegrationKOTypes.xsd | Тип: Информация об отказе в рассмотрении электронной жалобы, сформированной в ЛКП |
| `parElectronicComplaintType` | IntegrationKOTypes.xsd | Тип: Информация об электронной жалобе, сформированной в ЛКП |
| `parentProductInfoElectronicContractType` | IntegrationCPTypes.xsd | Тип: Родительский объект закупки в электронном контракте |
| `participantContractProjectInfoType` | CommonTypes.xsd | Тип: Поставщик для проекта контракта по ед.поставщику с номером ЕРУЗ |
| `participantExperiencesRef` | BaseTypes.xsd | Ссылка на справочник "Опыт участника закупки поставки товара, выполнения работы, оказания услуги" |
| `participantForPrintType` | CommonTypes.xsd | Тип: Поставщик для проекта контракта по ед.поставщику (для печати) |
| `participantInfoDeltaType` | IntegrationCPTypes.xsd | Тип: Информация о поставщике для дельты электронного доп соглашения |
| `participantInfoType` | IntegrationCETypes.xsd | Информация о поставщике (подрядчике, исполнителе) |
| `participantLKPType` | CommonTypes.xsd | Тип: Поставщик для проекта контракта по ед.поставщику |
| `participantType` | CommonTypes.xsd | Тип: Поставщик для протоколов электронных процедур |
| `participantType` | IntegrationCPTypes.xsd | Тип: Поставщик |
| `participantURType` | CommonTypes.xsd | Тип: Поставщик для документов одностороннего отказа |
| `paymentDetailInfoType` | CommonTypes.xsd | Тип: Платежные данные для проверки |
| `paymentGuaranteeInfoType` | CommonTypes.xsd | Тип: Информация о платеже для гарантийных обязательств в извещении |
| `paymentInfoType` | Integration615Types.xsd | Тип: Информация о платеже для обеспечения заявки (исполнения договора) или за предоставление документации |
| `paymentInfoType` | IntegrationEPTypes.xsd | Тип: Информация о платеже для обеспечения заявки (исполнения контракта) или за предоставление документации |
| `paymentPropertysType` | CommonTypes.xsd | Тип: Платежные реквизиты |
| `paymentYearInfoType` | IntegrationCPTypes.xsd | Тип: Сумма платежа за указанный год |
| `pdCommonAddInfoType` | CommonTypes.xsd | Тип: Общая информация доп соглашения для протокола разногласий |
| `pdCommonAddType` | CommonTypes.xsd | Тип: Доп.соглашение (общая информация) для протокола разногласий |
| `penaltyRequirementInfoType` | IntegrationCETypes.xsd | Требование о неустойке |
| `personType` | CommonTypes.xsd | Тип: ФИО |
| `personType` | Integration615Types.xsd | Тип: ФИО |
| `personWithoutOblType` | CommonTypes.xsd | Тип: ФИО без обязательности |
| `placerProjectInfoType` | CommonTypes.xsd | Тип: Информация об организации, разместившей контракт |
| `placingWayRef` | BaseTypes.xsd | Ссылка на справочник "Подспособы определения поставщика" (nsiPlacingWay) |
| `placingWayType` | Integration615Types.xsd | Тип: Подспособ определения поставщика |
| `POAttorneyWithLogType` | CommonTypes.xsd | Тип: Сведения о доверенности с логином пользователя |
| `powerOfAttorneyPrivilegesType` | CommonTypes.xsd | Тип: Информация о доверенности с привилегиями пользователя |
| `powerOfAttorneyType` | CommonTypes.xsd | Тип: Сведения о доверенности |
| `prApplicationsType` | IntegrationEPTypes.xsd | Тип: Заявки на участие |
| `prApplicationType` | IntegrationEPTypes.xsd | Тип: Заявка на участие |
| `prCustomerInfoType` | IntegrationEPTypes.xsd | Тип: Информация по заказчику |
| `prCustomerQuantityType` | IntegrationEPTypes.xsd | Тип: Количество по объектам закупки |
| `prCustomersInfoType` | IntegrationEPTypes.xsd | Тип: Информация по заказчикам |
| `prCustomersQuantityType` | IntegrationEPTypes.xsd | Тип: Количество по объектам закупки (таблица) |
| `preferenseType` | CommonTypes.xsd | Тип: Преимущество для участников |
| `prefRateRef` | BaseTypes.xsd | Ссылка на справочник "Варианты размеров преференциальных ставок" |
| `prefsReqsRef` | BaseTypes.xsd | Ссылка на справочник "Преимущества (требования, ограничения)" |
| `preliminaryOfferType` | IntegrationEPTypes.xsd | Тип: Предварительное предложение; внесение изменений в предварительное предложение |
| `prescriptionType` | IntegrationCPTypes.xsd | Тип: Предписание органа, уполномоченного на осуществление контроля, не содержащееся в реестре результатов контроля |
| `prescriptionType` | IntegrationEPTypes.xsd | Тип: Предписание органа, уполномоченного на осуществление контроля, не содержащееся в реестре результатов контроля |
| `prescriptionTypeRef` | CommonTypes.xsd | Ссылка на справочник типов предписаний |
| `printFormFieldsCancelType` | CommonTypes.xsd | Тип: Дополнительная информация для печатной формы в извещении |
| `printFormFieldsRefusalType` | CommonTypes.xsd | Тип: Дополнительная информация для печатной формы в отказе |
| `printFormStoreType` | CommonTypes.xsd | Тип: Печатная форма (c гуидом контента) |
| `printFormType` | CommonTypes.xsd | Тип: Печатная форма |
| `printFormType` | Integration615Types.xsd | Тип: Печатная форма |
| `printFormWithDSUidType` | CommonTypes.xsd | Тип: Печатная форма с указанием гуидов ХД |
| `printFormXslInfoType` | CommonTypes.xsd | Тип: Информация для преобразования печатной формы |
| `procedureCancelFailureType` | IntegrationCPTypes.xsd | Тип: Отмена извещения об отмене процедуры заключения контракта |
| `procedureCancelLKPType` | IntegrationCPTypes.xsd | Тип: Извещение об отмене процедуры заключения контракта (ЛКП) |
| `procedureCancelType` | IntegrationCPTypes.xsd | Тип: Извещение об отмене процедуры заключения контракта |
| `procedureCollecting2020Type` | IntegrationEPTypes.xsd | Тип: Данные процедуры сбора заявок с даты начала действия оптимизационного законопроекта 44-ФЗ |
| `procedureCollectingType` | IntegrationEPTypes.xsd | Тип: Данные процедуры сбора заявок |
| `procedureEF2020Type` | IntegrationEPTypes.xsd | Тип: Информация о процедуре закупки ЭA20 (аукцион в электронной форме) с даты начала действия оптимизационного законопроекта 44-ФЗ ) |
| `procedureEOK2020Type` | IntegrationEPTypes.xsd | Тип: Информация о процедуре закупки ЭОК20 (открытый конкурс в электронной форме) с даты начала действия оптимизационного законопроекта 44-ФЗ |
| `procedureEOKDType` | IntegrationEPTypes.xsd | Тип: Информация о процедуре закупки ЭОК (открытый конкурс в электронной форме) |
| `procedureEOKType` | IntegrationEPTypes.xsd | Тип: Информация о процедуре закупки ЭОК (открытый конкурс в электронной форме) |
| `procedureEZakAType` | IntegrationEPTypes.xsd | Тип: Информация о процедуре закупки ЭЗакА (закрытый аукцион в электронной форме) |
| `procedureEZK2020Type` | IntegrationEPTypes.xsd | Тип: Информация о процедуре закупки ЭЗК (запрос котировок в электронной форме) с даты начала действия оптимизационного законопроекта 44-ФЗ |
| `procedureEZKType` | IntegrationEPTypes.xsd | Тип: Информация о процедуре закупки ЭЗК (запрос котировок в электронной форме) |
| `procedureEZPType` | IntegrationEPTypes.xsd | Тип: Информация о процедуре закупки ЭЗП (запрос предложений в электронной форме) |
| `procedureScoringType` | IntegrationEPTypes.xsd | Тип: Данные процедуры Информация о процедуре рассмотрения и оценки заявок |
| `processingProjectResultType` | eisSignIncoming.xsd | Тип: Уведомление о результатах обработки информационного пакета для принятых проектов документов |
| `processingResultRequest` | eisSignIncoming.xsd | Пакет данных:Запрос уведомления о результатах обработки информационного пакета |
| `processingResultType` | eisSignIncoming.xsd | Тип: Уведомление о результатах обработки информационного пакета |
| `productInfoElectronicAdditionalType` | IntegrationCPTypes.xsd | Тип: Объект закупки в электронном доп.соглашении |
| `productInfoElectronicContractType` | IntegrationCPTypes.xsd | Тип: Объект закупки в электронном контракте |
| `productInfoFinalProtocolEMZType` | IntegrationEPTypes.xsd | Тип: Объект закупки (предложение) в итоговом протоколе (ЭМЗ) |
| `productInfoFinalProtocolType` | IntegrationEPTypes.xsd | Тип: Объект закупки (предложение) в итоговом протоколе |
| `productsInfoElectronicAdditionalType` | IntegrationCPTypes.xsd | Тип: Объекты закупки в электронном доп.соглашении |
| `productsInfoElectronicContractType` | IntegrationCPTypes.xsd | Тип: Объекты закупки в электронном контракте |
| `prolongationCancelEOKDType` | IntegrationEPTypes.xsd | Тип: Отмена извещения о продлении срока подачи заявок на участие в ЭOKД (двухэтапный конкурс в электронной форме); внесение изменений |
| `prolongationCancelEOKOUType` | IntegrationEPTypes.xsd | Тип: Отмена извещения о продлении срока подачи заявок на участие в ЭOK-ОУ (открытый конкурс с ограниченным участием в электронной форме); внесение изменений |
| `prolongationCancelEOKType` | IntegrationEPTypes.xsd | Тип: Отмена извещения о продлении срока подачи заявок на участие в ЭOK (открытый конкурс в электронной форме) |
| `prolongationCancelEZKType` | IntegrationEPTypes.xsd | Тип: Отмена извещения о продлении срока подачи заявок на участие в ЭЗК (запрос котировок в электронной форме) |
| `prolongationEOKDType` | IntegrationEPTypes.xsd | Тип: Извещение о продлении срока подачи заявок на участие в ЭOKД (двухэтапный конкурс в электронной форме) |
| `prolongationEOKOUType` | IntegrationEPTypes.xsd | Тип: Извещение о продлении срока подачи заявок в ЭOK-ОУ (открытый конкурс с ограниченным участием в электронной форме) |
| `prolongationEOKType` | IntegrationEPTypes.xsd | Тип: Извещение о продлении срока подачи заявок на участие в ЭOK (открытый конкурс в электронной форме) |
| `prolongationEZKType` | IntegrationEPTypes.xsd | Тип: Извещение о продлении срока подачи заявок на участие в ЭЗК (запрос котировок в электронной форме) |
| `prolongationInfoType` | IntegrationEPTypes.xsd | Тип: Информация о продлении |
| `proposalsResultType` | IntegrationEPTypes.xsd | Тип: Результаты распределения количества товаров по каждому заказчику после подведения итогов определения поставщика |
| `protocol2020CommonInfoType` | IntegrationEPTypes.xsd | Тип: Общая информация о протоколе с даты начала действия оптимизационного законопроекта 44-ФЗ |
| `protocol2020Type` | IntegrationEPTypes.xsd | Тип: Общие поля протоколов с даты начала действия оптимизационного законопроекта 44-ФЗ |
| `protocolCancelType` | Integration615Types.xsd | Информация об отмене протокола |
| `protocolCancelType` | IntegrationEPTypes.xsd | Тип: Информация об отмене протокола, принятого от ЭТП |
| `protocolCharacteristicValueWithSidsTextFormType` | IntegrationEPTypes.xsd | Тип: Значение характеристики позиции в итоговом протоколе, которое связано со значением характеристики в извещении в текстовой форме |
| `protocolCharacteristicValueWithSidsType` | IntegrationEPTypes.xsd | Тип: Значение характеристики позиции в итоговом протоколе, которое связано со значением характеристики в извещении |
| `protocolCommonInfoType` | Integration615Types.xsd | Тип: Общая информация о протоколе |
| `protocolCommonInfoType` | IntegrationEPTypes.xsd | Тип: Общая информация о протоколе |
| `protocolDeltaType` | IntegrationCPTypes.xsd | Тип: Протокол изменений электронного контракта |
| `protocolDeviationType` | IntegrationEPTypes.xsd | Тип: Протокол признания участника уклонившимся от заключения контракта с 01.04.2021 |
| `protocolDisagreementsLKPType` | IntegrationCPTypes.xsd | Тип: Протокол разногласий (ЛКП) |
| `protocolDisagreementsType` | IntegrationCPTypes.xsd | Тип: Протокол разногласий |
| `protocolEF1InfoType` | Integration615Types.xsd | Тип: Информация о рассмотрении заявок на участие в электронном аукционе |
| `protocolEF1Type` | Integration615Types.xsd | Протокол рассмотрения заявок на участие в электронном аукционе |
| `protocolEF2020FinalPartType` | IntegrationEPTypes.xsd | Тип: Протокол подведения итогов определения поставщика (подрядчика, исполнителя) ЭА20 (аукцион в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) с информацией об участниках |
| `protocolEF2020FinalType` | IntegrationEPTypes.xsd | Тип: Протокол подведения итогов определения поставщика (подрядчика, исполнителя) ЭА20 (аукцион в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `protocolEF2020SubmitOffersType` | IntegrationEPTypes.xsd | Тип: Протокол подачи ценовых предложений ЭА20 (аукцион в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `protocolEF2InfoType` | Integration615Types.xsd | Тип: Информация о проведении электронного аукциона |
| `protocolEF2Type` | Integration615Types.xsd | Протокол проведения электронного аукциона |
| `protocolEMZ2025FinalPartType` | IntegrationEPTypes.xsd | Тип: Протокол подведения итогов определения поставщика (подрядчика, исполнителя) ЭЗМ (Закупка у единственного поставщика по пункту 4, 5 части 1 статьи 93 Закона № 44-ФЗ) с информацией об участниках |
| `protocolEMZ2025FinalType` | IntegrationEPTypes.xsd | Тип: Протокол подведения итогов определения поставщика (подрядчика, исполнителя) ЭЗМ (Закупка у единственного поставщика по пункту 4, 5 части 1 статьи 93 Закона № 44-ФЗ) |
| `protocolEMZCommonInfoType` | IntegrationEPTypes.xsd | Тип: Общая информация о протоколе с даты начала действия оптимизационного законопроекта 44-ФЗ (ЭМЗ) |
| `protocolEMZType` | IntegrationEPTypes.xsd | Тип: Общие поля протоколов с даты начала действия оптимизационного законопроекта 44-ФЗ (ЭМЗ) |
| `protocolEOK1Type` | IntegrationEPTypes.xsd | Тип: Протокол рассмотрения и оценки первых частей заявок на участие в ЭOK (открытый конкурс в электронной форме); внесение изменений |
| `protocolEOK2020FinalPartType` | IntegrationEPTypes.xsd | Тип: Протокол подведения итогов ЭOK20 (открытый конкурс в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) с информацией об участниках |
| `protocolEOK2020FinalType` | IntegrationEPTypes.xsd | Тип: Протокол подведения итогов ЭOK20 (открытый конкурс в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `protocolEOK2020FirstSectionsType` | IntegrationEPTypes.xsd | Тип: Протокол рассмотрения и оценки первых частей заявок на участие в ЭOK20 (открытый конкурс в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `protocolEOK2020SecondSectionsPartType` | IntegrationEPTypes.xsd | Тип: Протокол рассмотрения и оценки вторых частей заявок на участие в ЭOK20 (открытый конкурс в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) с информацией об участниках |
| `protocolEOK2020SecondSectionsType` | IntegrationEPTypes.xsd | Тип: Протокол рассмотрения и оценки вторых частей заявок на участие в ЭOK20 (открытый конкурс в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `protocolEOK2Type` | IntegrationEPTypes.xsd | Тип: Протокол рассмотрения и оценки вторых частей заявок на участие в ЭOK (открытый конкурс в электронной форме); внесение изменений |
| `protocolEOK3Type` | IntegrationEPTypes.xsd | Тип: Протокол подведения итогов ЭOK (открытый конкурс в электронной форме); внесение изменений |
| `protocolEOKD1Type` | IntegrationEPTypes.xsd | Тип: Протокол первого этапа ЭOKД (двухэтапный конкурс в электронной форме); внесение изменений |
| `protocolEOKD2Type` | IntegrationEPTypes.xsd | Тип: Протокол рассмотрения и оценки первых частей заявок на участие в ЭOKД (двухэтапный конкурс в электронной форме); внесение изменений |
| `protocolEOKD3Type` | IntegrationEPTypes.xsd | Тип: Протокол рассмотрения и оценки вторых частей заявок на участие в ЭOKД (двухэтапный конкурс в электронной форме); внесение изменений |
| `protocolEOKD4Type` | IntegrationEPTypes.xsd | Тип: Протокол подведения итогов ЭOKД (двухэтапный конкурс в электронной форме); внесение изменений |
| `protocolEOKDSingleAppType` | IntegrationEPTypes.xsd | Тип: Протокол рассмотрения единственной заявки на участие ЭOKД (двухэтапный конкурс в электронной форме); внесение изменений |
| `protocolEOKDSinglePartType` | IntegrationEPTypes.xsd | Тип: Протокол рассмотрения заявки единственного участника ЭOKД (двухэтапный конкурс в электронной форме); внесение изменений |
| `protocolEOKOU1Type` | IntegrationEPTypes.xsd | Тип: Протокол рассмотрения и оценки первых частей заявок на участие в ЭOK-ОУ (открытый конкурс с ограниченным участием в электронной форме); внесение изменений |
| `protocolEOKOU2Type` | IntegrationEPTypes.xsd | Тип: Протокол рассмотрения и оценки вторых частей заявок на участие в ЭOK-ОУ (открытый конкурс с ограниченным участием в электронной форме); внесение изменений |
| `protocolEOKOU3Type` | IntegrationEPTypes.xsd | Тип: Протокол подведения итогов ЭOK-ОУ (открытый конкурс с ограниченным участием в электронной форме); внесение изменений |
| `protocolEOKOUSingleAppType` | IntegrationEPTypes.xsd | Тип: Протокол рассмотрения единственной заявки на участие ЭOK-ОУ (открытый конкурс с ограниченным участием в электронной форме); внесение изменений |
| `protocolEOKOUSinglePartType` | IntegrationEPTypes.xsd | Тип: Протокол рассмотрения заявки единственного участника ЭOK-ОУ (открытый конкурс с ограниченным участием в электронной форме); внесение изменений |
| `protocolEOKSingleAppType` | IntegrationEPTypes.xsd | Тип: Протокол рассмотрения единственной заявки на участие ЭOK (открытый конкурс в электронной форме); внесение изменений |
| `protocolEOKSinglePartType` | IntegrationEPTypes.xsd | Тип: Протокол рассмотрения заявки единственного участника ЭOK (открытый конкурс в электронной форме); внесение изменений |
| `protocolEvasionType` | IntegrationEPTypes.xsd | Тип: Протокол об отказе от заключения контракта с 01.04.2021 |
| `protocolEvDevCancelType` | IntegrationEPTypes.xsd | Тип: Информация об отмене протокола ПОК/ППУ с 01.04.2021 |
| `protocolEvDevType` | IntegrationEPTypes.xsd | Тип: Общие поля для протоколов отказа от заключения контракта и протокола признания участника уклонившимся от заключения контракта |
| `protocolEZakA2020DocRequestType` | IntegrationEPTypes.xsd | Тип: Протокол рассмотрения запросов на представление документации о закупке в ЭЗакА20 (закрытый аукцион в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `protocolEZakA2020FinalType` | IntegrationEPTypes.xsd | Тип: Протокол подведения итогов определения поставщика (подрядчика, исполнителя) в ЭЗакА20 (закрытый аукцион в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `protocolEZakK2020DocRequestType` | IntegrationEPTypes.xsd | Тип: Протокол рассмотрения запросов на представление документации о закупке в ЭЗакК20 (закрытый конкурс в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `protocolEZakK2020FinalType` | IntegrationEPTypes.xsd | Тип: Протокол подведения итогов определения поставщика (подрядчика, исполнителя) в ЭЗакК20 (закрытый конкурс в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `protocolEZK1Type` | IntegrationEPTypes.xsd | Тип: Протокол рассмотрения заявок на участие в ЭЗК (запрос котировок в электронной форме) |
| `protocolEZK2020FinalPartType` | IntegrationEPTypes.xsd | Тип: Протокол подведения итогов определения поставщика (подрядчика, исполнителя) ЭЗК20 (запрос котировок в электронной форме c 01.04.2021 года) с информацией об участниках |
| `protocolEZK2020FinalType` | IntegrationEPTypes.xsd | Тип: Протокол подведения итогов определения поставщика (подрядчика, исполнителя) ЭЗК20 (запрос котировок в электронной форме c 01.04.2021 года) |
| `protocolEZK2Type` | IntegrationEPTypes.xsd | Тип: Протокол рассмотрения и оценки заявок на участие в ЭЗК (запрос котировок в электронной форме) |
| `protocolEZP1ExtractType` | IntegrationEPTypes.xsd | Тип: Выписка из протокола проведения ЭЗП (запрос предложений в электронной форме); внесение изменений |
| `protocolEZP1Type` | IntegrationEPTypes.xsd | Тип: Протокол проведения ЭЗП (запрос предложений в электронной форме); внесение изменений |
| `protocolEZP2Type` | IntegrationEPTypes.xsd | Тип: Итоговый протокол ЭЗП (запрос предложений в электронной форме); внесение изменений |
| `protocolEZPType` | IntegrationEPTypes.xsd | Тип: Общие поля протоколов для ЭЗП (запрос предложений в электронной форме) |
| `protocolEZT2020FinalPartType` | IntegrationEPTypes.xsd | Тип: Протокол подведения итогов определения поставщика ЭЗТ (закупка товаров согласно ч.12 ст. 93 № 44-ФЗ) с информацией об участниках |
| `protocolEZT2020FinalType` | IntegrationEPTypes.xsd | Тип: Протокол подведения итогов определения поставщика ЭЗТ (закупка товаров согласно ч.12 ст. 93 № 44-ФЗ) |
| `protocolInfoType` | IntegrationCPTypes.xsd | Тип: Реквизиты документа, подтверждающего основание заключения контракта |
| `protocolPOInfoType` | Integration615Types.xsd | Тип: Информация о проведении предварительного отбора |
| `protocolPOType` | Integration615Types.xsd | Протокол предварительного отбора в ПО |
| `protocolType` | IntegrationEPTypes.xsd | Тип: Общие поля протоколов |
| `publicDiscussionInfoType` | CommonTypes.xsd | Тип: Сведения об общественном обсуждении |
| `publicDiscussionType` | IntegrationEPTypes.xsd | Тип: Информация об общественном обсуждении по лоту закупки |
| `purchaseActType` | Integration615Types.xsd | Тип: Общая информация о актах |
| `purchaseCancelType` | Integration615Types.xsd | Тип: Отмена закупки |
| `purchaseCommonInfoType` | Integration615Types.xsd | Тип: Общая информация о документах закупки |
| `purchaseContractorInfoType` | Integration615Types.xsd | Тип: Сведения о подрядной организации |
| `purchaseDocumentCommonInfoType` | IntegrationEPTypes.xsd | Тип: Общая информация о документе закупки |
| `purchaseDocumentCommonType` | Integration615Types.xsd | Тип: Общая информация о документе закупки |
| `purchaseDocumentType` | IntegrationEPTypes.xsd | Тип: Общие поля документов закупки |
| `purchaseDrugObjectsClosedInfoType` | CommonTypes.xsd | Тип: Сведения об объектах закупки в том случае, когда объектами закупки являются лекарственные препараты (для закрытых СОП ПРИЗ (ЗакК, (ЗакА)) |
| `purchaseDrugObjectsEMZInfoType` | CommonTypes.xsd | Тип: Сведения об объектах закупки в том случае, когда объектами закупки являются лекарственные препараты для ЭМЗ (ПРИЗ) |
| `purchaseDrugObjectsEZTInfoType` | CommonTypes.xsd | Тип: Сведения об объектах закупки в том случае, когда объектами закупки являются лекарственные препараты для ЭЗТ2020 (ПРИЗ) |
| `purchaseDrugObjectsInfoType` | CommonTypes.xsd | Тип: Сведения об объектах закупки в том случае, когда объектами закупки являются лекарственные препараты (ПРИЗ) |
| `purchaseIsMaxPriceCurrencyType` | CommonTypes.xsd | Тип: НМЦК в валюте контракта |
| `purchaseModificationType` | Integration615Types.xsd | Тип: Внесение исправлений в документ закупки |
| `purchaseNotificationType` | Integration615Types.xsd | Тип: Общая информация об извещении по закупке |
| `purchaseObjectCharsRef` | BaseTypes.xsd | Ссылка на справочник "Характеристики объекта закупки (nsiPurchaseObjectChars)" |
| `purchaseObjects2020Type` | CommonTypes.xsd | Тип: Информация по объектам закупки, не являющимся лекарственными препаратами, начиная с даты начала действия оптимизационного законопроекта 44-ФЗ |
| `purchaseObjects615InfoType` | Integration615Types.xsd | Тип: Виды услуг и (или) работ по ПП РФ № 615 |
| `purchaseObjectsClosed2020Type` | CommonTypes.xsd | Тип: Информация по объектам закупки, не являющимся лекарственными препаратами для закрытых СОП (ЗакК, (ЗакА) |
| `purchaseObjectsContracts615InfoType` | Integration615Types.xsd | Тип: Виды услуг и (или) работ о ПП РФ № 615 для реестра договоров |
| `purchaseObjectsEMZType` | CommonTypes.xsd | Тип: Информация по объектам закупки, не являющимся лекарственными препаратами, начиная с даты начала действия оптимизационного законопроекта 44-ФЗ (ЭМЗ) |
| `purchaseObjectsProductsInfoType` | Integration615Types.xsd | Тип: Товары по ПП РФ № 615 |
| `purchaseObjectsType` | CommonTypes.xsd | Тип: Информация по объектам закупки, не являющимся лекарственными препаратами |
| `purchaseOrganizationInfoType` | Integration615Types.xsd | Тип: Данные организации, участвующей в закупке |
| `purchaseParentObjects2020Type` | CommonTypes.xsd | Тип: Информация по родительским объектам закупки, не являющимся лекарственными препаратами |
| `purchaseProtocolType` | Integration615Types.xsd | Тип: Общая информация о протоколах |
| `purchaseSubjectRef` | BaseTypes.xsd | Ссылка на справочник "Предметы электронного аукциона по ПП РФ № 615" |
| `qualifiedContractorExcludeCancelType` | Integration615Types.xsd | Сведения об отмене исключения квалифицированной подрядной организации из РКПО по ПП РФ № 615 |
| `qualifiedContractorExcludeType` | Integration615Types.xsd | Сведения об исключении квалифицированной подрядной организации из РКПО по ПП РФ № 615 |
| `qualifiedContractorRef` | BaseTypes.xsd | Ссылка на реестр квалифицированных подрядных организаций по ПП РФ № 615 |
| `qualifiedContractorType` | Integration615Types.xsd | Сведения о квалифицированной подрядной организации для включения в РКПО по ПП РФ № 615 |
| `qualitativeCriterionDocOKType` | IntegrationEPTypes.xsd | Тип: Нестоимостной критерий оценки в рамках проведения конкурсов в электронной форме |
| `qualitativeCriterionDocZPType` | IntegrationEPTypes.xsd | Тип: Нестоимостной критерий оценки в рамках проведения запроса предложений в электронной форме |
| `qualitativeCriterionProtocolOK12020Type` | IntegrationEPTypes.xsd | Тип: Нестоимостной критерий оценки в протоколе рассмотрения и оценки первых частей заявок на участие в ЭOK20 |
| `qualitativeCriterionProtocolOK1Type` | IntegrationEPTypes.xsd | Тип: Нестоимостной критерий оценки в протоколе рассмотрения и оценки первых частей заявок на участие в ЭOK (открытый конкурс в электронной форме) |
| `qualitativeCriterionProtocolOK2Type` | IntegrationEPTypes.xsd | Тип: Нестоимостной критерий оценки в протоколе рассмотрения и оценки вторых частей заявок на участие в ЭOK (открытый конкурс в электронной форме) |
| `qualitativeCriterionProtocolOK32020Type` | IntegrationEPTypes.xsd | Тип: Нестоимостной критерий оценки в итоговом протоколе в рамках проведения ЭOK20 |
| `qualitativeCriterionProtocolOK3Type` | IntegrationEPTypes.xsd | Тип: Нестоимостной критерий оценки в итоговом протоколе в рамках проведения конкурсов в электронной форме |
| `qualitativeCriterionProtocolZPType` | IntegrationEPTypes.xsd | Тип: Нестоимостной критерий оценки в протоколе в рамках проведения запроса предложений в электронной форме |
| `qualPurchaseParticipantsRef` | BaseTypes.xsd | Ссылка на справочник "Квалификация участников закупки" |
| `rangeType` | eis-fs-ws-api.xsd | Тип: Диапазон |
| `RBGObjectInfoType` | docs-https-api.xsd | Тип: Краткие сведения об опубликованном документе РНГ |
| `rcCommonAddInfoType` | CommonTypes.xsd | Тип: Общая информация доп соглашения для отказа |
| `rcCommonAddType` | CommonTypes.xsd | Тип: Доп.соглашение (общая информация) для отказа |
| `reasonLKPType` | IntegrationCPTypes.xsd | Тип: Основание отмены процедуры заключения контракта |
| `reasonRef` | BaseTypes.xsd | Ссылка на справочник "Основание для заключения контракта с единственным поставщиком" |
| `receiptCodesRef` | BaseTypes.xsd | Ссылка на справочник "Коды поступлений для АУ/БУ" |
| `receiveRgRequestType` | eisSigningSOAPMessages.xsd |  |
| `receiveRokoRequestType` | eisSigningSOAPMessages.xsd |  |
| `receiveRppOvkRequestType` | eisSigningSOAPMessages.xsd |  |
| `receiveRppRequestType` | eisSigningSOAPMessages.xsd |  |
| `receiveRrkOvkRequestType` | eisSigningSOAPMessages.xsd |  |
| `receiveRrkRequestType` | eisSigningSOAPMessages.xsd |  |
| `receiveRvpOvkRequestType` | eisSigningSOAPMessages.xsd |  |
| `receiveRvpRequestType` | eisSigningSOAPMessages.xsd |  |
| `recipientInfoType` | IntegrationCETypes.xsd | Информация о получателе (плательщике при возврате оплаты) |
| `reestrPrescriptionType` | IntegrationCPTypes.xsd | Тип: Предписание органа, уполномоченного на осуществление контроля, содержащееся в реестре результатов контроля |
| `reestrPrescriptionType` | IntegrationEPTypes.xsd | Тип: Предписание органа, уполномоченного на осуществление контроля, содержащееся в реестре результатов контроля |
| `refKTRUCharacteristicType` | CommonTypes.xsd | Тип КТРУ: Характеристика товаров, работ, услуг для ввода из справочника |
| `refKTRUCharacteristicWithSidsType` | CommonTypes.xsd | Тип КТРУ: Характеристика товаров, работ, услуг с идентификаторами для ввода из справочника |
| `refKTRUProtocolCharacteristicWithSidsType` | IntegrationEPTypes.xsd | Тип КТРУ: Характеристика товаров, работ, услуг в итоговом протоколе для ввода из справочника, которая связана с характеристикой позиции в извещении |
| `refPacketType` | eis-fs-ws-api.xsd | Информационный пакет ответа на запрос |
| `refusalConcludeContractLKPType` | IntegrationCPTypes.xsd | Тип: Отказ участника закупки от заключения контракта (ЛКП) |
| `refusalConcludeContractType` | IntegrationCPTypes.xsd | Тип: Отказ участника закупки от заключения контракта |
| `refusalFact` | Integration615Types.xsd | Тип: Отказ от заключения контракта |
| `registrationNumbersInfoType` | CommonTypes.xsd | Тип: Реестровые номера |
| `registryCommonInfoType` | Integration615Types.xsd | Тип: Общая информация о реестровой записи |
| `rejectDocInfoType` | IntegrationURTypes.xsd | Тип: Требование о признании недействительным решения об одностороннем отказе |
| `rejectReasonRef` | BaseTypes.xsd | Ссылка на справочник "Причины для отказа в допуске заявки" |
| `relationAndRightsByOrgType` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Тип: Информация о связи и установленных правах по организации |
| `relativeAndNotRelativeTerms2022Type` | CommonTypes.xsd | Тип: Относительные и неотносительные сроки контракта, начиная с версии ЕИС с 01.10.2022 |
| `relativeAndNotRelativeTermsType` | CommonTypes.xsd | Тип: Относительные и неотносительные сроки исполнения контракта |
| `relativeAndNotRelativeTermsType` | IntegrationCPTypes.xsd | Тип: Относительные и неотносительные сроки |
| `relativeAndNotRelativeTermsWithoutOblType` | IntegrationCPTypes.xsd | Тип: Относительные и неотносительные сроки без обязательности |
| `removeTreasurySupportReasonsType` | CommonTypes.xsd | Тип: Ссылка на справочник причин снятия требования казначейского сопровождения контракта |
| `requestContractProjectSignLKPType` | IntegrationCPTypes.xsd | Тип: Запрос на изменение проекта контракта, подписанного поставщиком (ЛКП) |
| `requirement2020Type` | CommonTypes.xsd | Тип: Требование к участникам с 01.10.2020 |
| `requirement2020WithAddReqsType` | CommonTypes.xsd | Тип: Требование (ограничение) к участникам (с дополнительными требованиями) с 01.10.2020 |
| `requirementRestrictionType` | CommonTypes.xsd | Тип: Требование (ограничение) к участникам |
| `requirementsDocInfoType` | CommonTypes.xsd | Тип: Документы, подтверждающие обеспечение исполнения контракта |
| `requirementWithAddReqsType` | CommonTypes.xsd | Тип: Требование (ограничение) к участникам (с дополнительными требованиями) |
| `reSendPackageType` | IntegrationSMTypes.xsd | Тип: Запрос на повторную отправку пакета |
| `restrictionsInfoType` | CommonTypes.xsd | Тип: Ограничения для участников |
| `restrictionSt14Type` | CommonTypes.xsd | Тип: Сведения по запрету, ограничению участия, условию допуска |
| `restrictionType` | CommonTypes.xsd | Тип: Ограничение для участников |
| `resultResponseType` | eisSigningSOAPMessages.xsd | Тип: Результат приёма документа в ЕИС |
| `righSideKTRURef` | BaseTypes.xsd | Тип: Ссылка на ПЧ КТРУ |
| `rightSideKTRUCharacteristicType` | CommonTypes.xsd | Тип: Характеристика позиции правой части (ПЧ) КТРУ |
| `RNPObjectInfoType` | docs-ws-api.xsd | Тип: Сведения о размещенном документе РНП. Устарело, не применяется с 01.04.2022 |
| `schemeVersion` | BaseTypes.xsd | Тип: Текущая версия схем |
| `scoringType` | IntegrationEPTypes.xsd | Тип: Оценка члена комиссии |
| `separateDepartmentAccountsDetailsForContractsType` | CommonTypes.xsd | Тип: Информация о платежных реквизитах обособленного подразделения для РК со ссылками на идентификаторы РЭК |
| `separateDepartmentAccountsDetailsType` | CommonTypes.xsd | Тип: Информация о платежных реквизитах обособленного подразделения |
| `separateDepartmentAccountsDetailsWithoutOblType` | CommonTypes.xsd | Тип: Информация о платежных реквизитах обособленного подразделения без обязательности |
| `serviceWorkSt166Ref` | BaseTypes.xsd | Ссылка на справочник Виды услуг и (или) работ в соотвествии со ст. 166 Жилищного кодекса РФ |
| `signatureCommonType` | CommonTypes.xsd | Тип: Электронная подпись |
| `signatureDSUidType` | CommonTypes.xsd | Тип: Электронная подпись с указанием гуида ХД |
| `signatureType` | CommonTypes.xsd | Тип: Электронная подпись |
| `signingResultNoticeType` | IntegrationSMTypes.xsd | Тип: Квитанция с результатами подписания проекта документа |
| `singleAppType` | IntegrationEPTypes.xsd | Тип: Общий тип для завки, в случае указания в протоколе рассмотрения единственной заявки |
| `singlePartType` | IntegrationEPTypes.xsd | Тип: Общий тип для завки, в случае указания в протоколе рассмотрения заявки единственного участника |
| `singleSupplierOnlyParticipantType` | CommonTypes.xsd | Тип: Закупка у прямого единственного поставщика (общая информация, поставщик) |
| `singleSupplierOutsideType` | IntegrationCPTypes.xsd | Тип: Закупка у прямого единственного поставщика (ЛКП) "с улицы" |
| `singleSupplierProcedureCancelType` | CommonTypes.xsd | Тип: Закупка у прямого единственного поставщика (общая информация, поставщик, информация о контракте) |
| `singleSupplierType` | IntegrationCPTypes.xsd | Тип: Закупка у прямого единственного поставщика (ЛКП) |
| `stagesInfoType` | IntegrationEPTypes.xsd | Тип: Этапы исполнения контракта в извещении |
| `stagetInfoType` | IntegrationCETypes.xsd | Информация об этапе контракта |
| `stageType` | Integration615Types.xsd | Тип: Этап договора |
| `startRequestPacketType` | eis-fs-ws-api.xsd | Тип для пакета данных: Запрос инициации сессии передачи файла в файловое хранилище |
| `startRequestType` | eis-fs-ws-api.xsd | Тип: Запрос инициации сессии передачи файла в файловое хранилище |
| `startResponsePacketType` | eis-fs-ws-api.xsd | Тип для пакета данных: Ответ на инициацию сессии передачи файла |
| `startResponseType` | eis-fs-ws-api.xsd | Тип: Ответ на инициацию сессии передачи файла |
| `subjectInfoType` | IntegrationKOTypes.xsd | Тип: Информация о субъекте жалобы |
| `supplierAccountsDetailContractInfo` | IntegrationCETypes.xsd | Реквизиты счета поставщика |
| `supplierDataChangeNoticeType` | IntegrationURTypes.xsd | Тип: Уведомление об изменении реквизитов поставщика по контракту |
| `supplierInfoType` | IntegrationEATypes.xsd | Тип: Информация о поставщике |
| `supplierStatusRef` | BaseTypes.xsd | Ссылка на справочник "Наименование статуса поставщика" |
| `targetArticleFinancingsMandatoryYearType` | CommonTypes.xsd | Тип: Детализация по целевым статьямс с обязательным текущим плановым годом |
| `targetArticleFinancingsType` | CommonTypes.xsd | Тип: Детализация по целевым статьям |
| `targetArticleFinancingType` | CommonTypes.xsd | Тип: Детализация по целевой статье |
| `tendePlanEPInfoType` | IntegrationEPTypes.xsd | Тип: Информация о плане-графике |
| `tenderPlan2020AgreementTotalsInfoType` | IntegrationTPTypes.xsd | Тип: Итоговый показатель по соглашениям о предоставлении субсидий |
| `tenderPlan2020ChangeType` | IntegrationTPTypes.xsd | Изменение плана-графика закупок в структурированной форме |
| `tenderPlan2020CommonInfoType` | IntegrationTPTypes.xsd | Тип: Общие сведения плана-графика закупок с 01.01.2020 |
| `tenderPlan2020Control99NCType` | IntegrationTPTypes.xsd | План-график закупок с уведомлением о соответствии контролируемой информации по 99 статье |
| `tenderPlan2020FinanceResourcesType` | IntegrationTPTypes.xsd | Тип: Финансовое обеспечение закупки для плана-графика закупок |
| `tenderPlan2020InfoType` | CommonTypes.xsd | Тип: Информация о плане-графике закупок с 01.01.2020 |
| `tenderPlan2020KBKsInfoType` | IntegrationTPTypes.xsd | Тип: Детализация по кодам бюджетной классификации |
| `tenderPlan2020KBKsTotalsInfoType` | IntegrationTPTypes.xsd | Тип: Итоговые показатели плана-графика закупок по кодам бюджетной классификации |
| `tenderPlan2020KOKSInfoType` | IntegrationTPTypes.xsd | Тип: Детализация по кодам ОКС/ОНИ |
| `tenderPlan2020KTRURef` | IntegrationTPTypes.xsd | Тип: Ссылка на КТРУ для плана-графика закупок с 01.01.2020 |
| `tenderPlan2020KVRInfoType` | IntegrationTPTypes.xsd | Тип: Детализация по КВР |
| `tenderPlan2020KVRRefType` | CommonTypes.xsd | Тип: Классификация по КВР в планах графиках с 01.01.2020 |
| `tenderPlan2020KVRRefType` | IntegrationTPTypes.xsd | Тип: Классификация по КВР в планах-графиках закупок |
| `tenderPlan2020OKPD2RefType` | CommonTypes.xsd | Тип: Классификация по ОКПД2 в планах графиках с 01.01.2020 |
| `tenderPlan2020OrganizationType` | IntegrationTPTypes.xsd | Тип: Данные организации для плана-графика закупок |
| `tenderPlan2020PositionChangeReasonRef` | IntegrationTPTypes.xsd | Тип: Ссылка на справочник "Причины внесения изменений в позицию ПГ 2020" (nsiTenderPlan2020PositionChangeReason) |
| `tenderPlan2020PositionDecisionType` | IntegrationTPTypes.xsd | Тип: Вынесенное решение для позиции плана-графика закупок |
| `tenderPlan2020PositionType` | IntegrationTPTypes.xsd | Тип: Общие сведения позиции плана-графика закупок |
| `tenderPlan2020SpecialPurchasePositionType` | IntegrationTPTypes.xsd | Тип: Общие сведения позиции особой закупки плана-графика закупок |
| `tenderPlan2020SpecialPurchaseRef` | IntegrationTPTypes.xsd | Тип: Ссылка на справочник "Типы особых закупок" планах-графиках закупок с 01.01.2020 |
| `tenderPlan2020SpecialPurchaseType` | IntegrationTPTypes.xsd | Тип: Общие сведения особой закупки плана-графика закупок |
| `tenderPlan2020TargetArticleInfoType` | IntegrationTPTypes.xsd | Тип: Детализация по целевой статье |
| `tenderPlan2020Type` | IntegrationTPTypes.xsd | План-график закупок с 01.01.2020 |
| `tenderPlanCommonInfoType` | CommonTypes.xsd | Тип: Информация о плане-графике закупок для ед.поставщика |
| `tenderPlanPositionType` | CommonTypes.xsd | Тип: Номер позиции в плане-графике закупок |
| `tenderSuspension` | eisSignIncoming.xsd | Пакет данных:Информация о приостановке определения поставщика (подрядчика, исполнителя) в части заключения контракта. Прием пакета не осуществляется, начиная с версии 15.3 |
| `terminationCommonInfoType` | IntegrationCPTypes.xsd | Тип: Общая информация о расторжении контракта / признании судом контракта недействительным |
| `terminationGround615Ref` | BaseTypes.xsd | Ссылка на справочник Основания расторжения договора по капитальному ремонту ПП РФ № 615 |
| `terminationInfoType` | IntegrationCPTypes.xsd | Тип: Информация о расторжении контракта |
| `terminationReason615Ref` | BaseTypes.xsd | Ссылка на справочник Причины расторжения договора по капитальному ремонту ПП РФ № 615 |
| `terminationType` | IntegrationCPTypes.xsd | Тип: Информация о расторжении контракта / признании судом контракта недействительным |
| `thirdParticipantInfoDeltaType` | IntegrationCPTypes.xsd | Тип: Информация о контрагенте для оплаты третьим лицам для дельты электронного доп соглашения |
| `thirdParticipantInfoType` | CommonTypes.xsd | Тип: Информация о контрагентах для оплаты третьим лицам |
| `timeEFType` | Integration615Types.xsd | Время проведения электронного аукциона |
| `tradeInfoType` | CommonTypes.xsd | Тип: Торговое наименование (ТН) лекарственного препарата |
| `tradeNameInfoType` | CommonTypes.xsd | Тип: Торговое наименование (ТН), сформированное в текстовой форме |
| `tradeNamesInfoType` | CommonTypes.xsd | Тип: Торговые наименования (ТН), сформированные в текстовой форме |
| `transferDocumentCommonInfoType` | IntegrationEPTypes.xsd | Тип: Общая информация о протоколе с даты начала действия оптимизационного законопроекта 44-ФЗ |
| `transferDocumentType` | IntegrationEPTypes.xsd | Тип: Транспортный документ для ЭМЗ |
| `treasurySupportContractConditionsType` | CommonTypes.xsd | Тип: Ссылка на справочник условий о казначейском сопровождении контракта |
| `typeAppealPPRF1078Ref` | BaseTypes.xsd | Ссылка на справочник "Коды, установленные для случая направления обращения ППРФ 1078" (NSI_TYPE_APPEAL_PPRF_1078) |
| `unfairContractorType` | Integration615Types.xsd | Сведения о недобросовестой подрядной организации по ПП РФ № 615. Устарело, не применяется с 01.04.2022 |
| `unfairSupplier2022ExcludeType` | IntegrationKOTypes.xsd | Тип: Исключение записи Реестра недобросовестных поставщиков (РНП) с 01.04.2022 (Исключение записи РНПО по ПП РФ № 615) |
| `unfairSupplier2022Type` | IntegrationKOTypes.xsd | Тип: Запись Реестра недобросовестных поставщиков (РНП) с 01.04.2022 (Запись РНПО по ПП РФ № 615) |
| `unfairSupplierIKZType` | IntegrationKOTypes.xsd | Тип: Запись Реестра недобросовестных поставщиков (РНП) с 01.04.2022 (Запись РНПО по ПП РФ № 615) со сведениями об ИКЗ |
| `unplannedCheck` | eisSignIncoming.xsd | Пакет данных:Внеплановая проверка для ИС КО |
| `unplannedCheckCancel` | eisSignIncoming.xsd | Пакет данных:Информация об отмене проведения внеплановой проверки |
| `unplannedCheckTenderSusp` | eisSignIncoming.xsd | Пакет данных:Информация о приостановке определения поставщика (подрядчика, исполнителя) в части заключения контракта по внеплановой проверке |
| `unplannedEvent` | eisSignIncoming.xsd | Пакет данных: Информация по внеплановому контрольному мероприятию для ИС ОВК |
| `unplannedEventCancel` | eisSignIncoming.xsd | Пакет данных: Информация об отмене проведения внепланового контрольного мероприятия для ИС ОВК |
| `unplannedEventCancelProject` | eisSignIncoming.xsd | Пакет данных: Проект информации об отмене проведения внепланового контрольного мероприятия для ИС ОВК |
| `unplannedEventProject` | eisSignIncoming.xsd | Пакет данных: Проект информации по внеплановому контрольному мероприятию для ИС ОВК |
| `unplannedEventSuspension` | eisSignIncoming.xsd | Пакет данных: Информации о приостановке/возобновлении внепланового контрольного мероприятия |
| `valueRangeReferenceType` | CommonTypes.xsd | Тип: Диапазон значений для характеристик, которые имеют связь со справочными характеристиками |
| `valueRangeReferenceType` | IntegrationEPTypes.xsd | Тип: Диапазон значений для характеристик, которые имеют связь со справочными характеристиками |
| `valueRangeType` | CommonTypes.xsd | Тип: Диапазон значений |
| `valueRangeType` | IntegrationEPTypes.xsd | Тип: Диапазон значений |
| `VATRef` | BaseTypes.xsd | Ссылка на справочник "Ставки НДС" (nsiVATList) |
| `violationPDType` | CommonTypes.xsd | Тип: Нарушение |
| `violationType` | CommonTypes.xsd | Тип: Нарушение приема |
| `violationType` | eisSignIncoming.xsd | Нарушение приема |
| `violationType` | IntegrationKOTypes.xsd | Тип: Нарушение приема |
| `warrantyInfoType` | IntegrationEPTypes.xsd | Тип: Требования к гарантии качества товара, работы, услуги |
| `withFirstPOAttorneyListType` | CommonTypes.xsd | Тип: Сведения о доверенности поставщика и заказчика |
| `withFirstPOAttorneyType` | CommonTypes.xsd | Тип: Сведения о доверености с реквизитами первоначальной доверенности |
| `writeOffPenaltyReasonType` | BaseTypes.xsd | Ссылка на справочник "Основания списания неустоек (штрафов, пеней)" (nsiWriteOffPenaltyReasons) |
| `wsProcessingResultRequestType` | IntegrationSMTypes.xsd | Тип: Запрос результата обработки при сервисном взаимодействии |
| `wsProcessingResultType` | IntegrationSMTypes.xsd | Тип: Результат обработки при сервисном взаимодействии |
| `zfcs_abandonedReasonType` | IntegrationTypes.xsd | Основания признания процедуры несостоявшейся |
| `zfcs_accountType` | IntegrationTypes.xsd | Тип: Банковский cчет организации |
| `zfcs_addInfoInvalidType` | IntegrationTypes.xsd | Информация о недействительности записи реестра дополнительной информации |
| `zfcs_addInfoType` | IntegrationTypes.xsd | Запись реестра дополнительной информации |
| `zfcs_admissionResults` | IntegrationTypes.xsd | Результаты допуска заявки |
| `zfcs_appealDetailsType` | IntegrationTypes.xsd | Тип: Реквизиты обжалования решения (акта, заключения) для результата контроля |
| `zfcs_applicantNewType` | IntegrationTypes.xsd | Тип: Заявитель для РЖ по 44-ФЗ (согласно ПП РФ №1148) |
| `zfcs_applicantType` | IntegrationTypes.xsd | Тип: Заявитель для РЖ, РПП, РВН, РРК по 44-ФЗ |
| `zfcs_applicationAdmittedInfoType` | IntegrationTypes.xsd | Информация о допуске заявки в протоколах рассмотрения и оценки заявок на участие в открытых конкурсах |
| `zfcs_applicationCorrespondence` | IntegrationTypes.xsd | Соответствие участника преимуществам, требованиям к участникам (согласно действующему извещению о закупке / изменению извещения) |
| `zfcs_appRejectedReasonNotIDType` | IntegrationTypes.xsd | Причины отказа рассмотрения заявки без указания причины отказа из справочника |
| `zfcs_appRejectedReasonType` | IntegrationTypes.xsd | Причины отказа рассмотрения заявки |
| `zfcs_attachmentListType` | IntegrationTypes.xsd | Прикрепленные документы |
| `zfcs_attachmentType` | IntegrationTypes.xsd | Прикрепленный документ |
| `zfcs_auditActionSubjectsRef` | IntegrationTypes.xsd | Ссылка на предмет мероприятия аудита |
| `zfcs_auditResultType` | IntegrationTypes.xsd | Обобщенная информация о результатах деятельности органа аудита в сфере закупок |
| `zfcs_bankGuaranteeCustomer223Type` | IntegrationTypes.xsd | Тип: Сведения о заказчике для независимых гарантий 223ФЗ |
| `zfcs_bankGuaranteeInfoType` | IntegrationTypes.xsd | Тип: Информация о независимой гарантии для других документов, относящихся к независимой гарантии |
| `zfcs_bankGuaranteeInvalidType` | IntegrationTypes.xsd | Информация о недействительности сведений о независимой гарантии |
| `zfcs_bankGuaranteeOrganizationType` | IntegrationTypes.xsd | Тип: Данные организации в независимой гарантии |
| `zfcs_bankGuaranteeOtherBankNoticeType` | IntegrationTypes.xsd | Уведомления о получении доступа к реестровым записям других гарантов (для печатной формы) |
| `zfcs_bankGuaranteeParticipantType` | IntegrationTypes.xsd | Тип: Поставщик в сведениях о независимой гарантии |
| `zfcs_bankGuaranteePurchaseRequest223EnsureType` | IntegrationTypes.xsd | Тип: Обеспечение заявки для независимых гарантий 223ФЗ |
| `zfcs_bankGuaranteeRef223ReasonType` | IntegrationTypes.xsd | Тип: Ссылка на справочник "Причины отказа в принятии независимой гарантии по 223ФЗ" |
| `zfcs_bankGuaranteeRef615ReasonType` | IntegrationTypes.xsd | Тип: Ссылка на справочник "Причины отказа в принятии независимой гарантии по ПП РФ 615" (nsiBankGuaranteeRefusal615Reason) |
| `zfcs_bankGuaranteeRefReasonType` | IntegrationTypes.xsd | Тип: Причина отказа в принятии независимой гарантии. Ссылка на справочник "Причины отказа в принятии независимой гарантии" (nsiBankGuaranteeRefusalReason) |
| `zfcs_bankGuaranteeRefusalInvalidType` | IntegrationTypes.xsd | Сведения о недействительности отказа заказчика в принятии независимой гарантии |
| `zfcs_bankGuaranteeRefusalType` | IntegrationTypes.xsd | Сведения об отказе заказчика в принятии независимой гарантии; внесение изменений |
| `zfcs_bankGuaranteeReturnInfoType` | IntegrationTypes.xsd | Информация о возвращении независимой гарантии гаранту или об уведомлении об освобождении от обязательств по независимой гарантии |
| `zfcs_bankGuaranteeReturnInvalidType` | IntegrationTypes.xsd | Сведения о недействительности информации о возвращении независимой гарантии или об освобождении от обязательств по независимой гарантии |
| `zfcs_bankGuaranteeReturnType` | IntegrationTypes.xsd | Информация о возвращении независимой гарантии гаранту или об уведомлении, направляемом заказчиком гаранту, об отказе от прав по гарантии; внесение изменений |
| `zfcs_bankGuaranteeTerminationInvalidType` | IntegrationTypes.xsd | Сведения о недействительности информации о прекращении обязательств поставщика по независимой гарантии |
| `zfcs_bankGuaranteeTerminationType` | IntegrationTypes.xsd | Информация о прекращении обязательств поставщика по независимой гарантии; внесение изменений |
| `zfcs_bankGuaranteeType` | IntegrationTypes.xsd | Информация о выданной независимой гарантии; внесение изменений |
| `zfcs_baseRef` | IntegrationTypes.xsd | Основание для решения по результатам общественного обсуждения |
| `zfcs_bidType` | IntegrationTypes.xsd | Ценовое предложение |
| `zfcs_bigProjectCostType` | IntegrationTypes.xsd | Стоимость инвестиционного проекта в млн рублей |
| `zfcs_bigProjectFinancingsType` | IntegrationTypes.xsd | Источники и объемы финансирования инвестиционного проекта в ценах соответствующих лет |
| `zfcs_bigProjectFinancingYearsType` | IntegrationTypes.xsd | Источники и объемы финансирования этапа инвестиционного проекта |
| `zfcs_bigProjectMemberType` | IntegrationTypes.xsd | Участник инвестиционного проекта |
| `zfcs_bigProjectValueType` | IntegrationTypes.xsd | Объем выполненных работ в млн рублей / % от общего объема |
| `zfcs_budgetFinancingsType` | IntegrationTypes.xsd | План исполнения контракта за счет бюджетных средств |
| `zfcs_budgetFundsContract2015` | IntegrationTypes.xsd | Тип: Ссылка на Код и наименование бюджета в контракте |
| `zfcs_changeHiddenRequestType` | IntegrationTypes.xsd | Запрос на изменение признака сокрытия независимой гарантии. Служебный документ, не используется при обмене с внешними системами |
| `zfcs_checkPlanCheckInfoType` | IntegrationTypes.xsd | Тип: Информация по проверке плана проверок для документов КО и ОВК |
| `zfcs_checkPlanCommonInfoPrintFormType` | IntegrationTypes.xsd | Тип: Общая информация по плана проверок (для печатной формы) |
| `zfcs_checkPlanCommonInfoType` | IntegrationTypes.xsd | Тип: Общая информация плана проверок |
| `zfcs_checkPlanType` | IntegrationTypes.xsd | План проверок |
| `zfcs_checkResultActType` | IntegrationTypes.xsd | Тип: Акт результата контроля |
| `zfcs_checkResultCancelCommonInfoType` | IntegrationTypes.xsd | Тип: Общая информация отмены результата контроля |
| `zfcs_checkResultCancelType` | IntegrationTypes.xsd | Информация об отмене результата контроля |
| `zfcs_checkResultCommonInfoPrintFormType` | IntegrationTypes.xsd | Тип: Общая информация по результату контроля (для печатной формы) |
| `zfcs_checkResultCommonInfoType` | IntegrationTypes.xsd | Тип: Общая информация результата контроля |
| `zfcs_checkResultComplaintType` | IntegrationTypes.xsd | Тип: Информация о жалобе в результате контроля |
| `zfcs_checkResultDecisionType` | IntegrationTypes.xsd | Тип: Решение (заключение) результата контроля |
| `zfcs_checkResultPlannedCheckType` | IntegrationTypes.xsd | Тип: Информация о плановой проверке в результате контроля |
| `zfcs_checkResultPrescriptionType` | IntegrationTypes.xsd | Тип: Предписание результата контроля |
| `zfcs_checkResultType` | IntegrationTypes.xsd | Результат контроля |
| `zfcs_checkResultUnplannedCheckComplaintType` | IntegrationTypes.xsd | Тип: Информация о внеплановой проверке (рассмотрении жалобы) в результате контроля |
| `zfcs_checkResultUnplannedCheckType` | IntegrationTypes.xsd | Тип: Информация о внеплановой проверке в результате контроля |
| `zfcs_checkSubjectPlanType` | IntegrationTypes.xsd | Тип: Субъект плановой проверки |
| `zfcs_clarificationProcedureInfoType` | IntegrationTypes.xsd | Тип: Информация о предоставлении разъяснений положений документации |
| `zfcs_clarificationRequestType` | IntegrationTypes.xsd | Запрос ЭП о даче разъяснений положений документации по 44-ФЗ |
| `zfcs_clarificationType` | IntegrationTypes.xsd | Разъяснение положений документации/Дополнительная информация |
| `zfcs_closedMethodsOfReasonRef` | IntegrationTypes.xsd | Ссылка на справочник: Основания применения закрытого способа определения поставщика (подрядчика, исполнителя) |
| `zfcs_commissionMemberInAppType` | IntegrationTypes.xsd | Член комиссии в заявке |
| `zfcs_commissionMemberType` | IntegrationTypes.xsd | Член комиссии |
| `zfcs_commissionRoleType` | IntegrationTypes.xsd | Роли членов комиссий |
| `zfcs_commissionType` | IntegrationTypes.xsd | Комиссии по размещению заказа (определению поставщика) |
| `zfcs_commonUnitsMeasurementsType` | IntegrationTypes.xsd | Справочник: Общепринятые единицы измерения |
| `zfcs_complaintCancelInfoType` | IntegrationTypes.xsd | Тип: Сведения об отзыве жалобы |
| `zfcs_complaintCancelPrintFormType` | IntegrationTypes.xsd | Тип:Информация об отзыве жалобы для печатной формы |
| `zfcs_complaintCancelType` | IntegrationTypes.xsd | Информация об отзыве жалобы |
| `zfcs_complaintCommonInfoPrintFormType` | IntegrationTypes.xsd | Тип: Общая информация по жалобе (для печатной формы) |
| `zfcs_complaintCommonInfoType` | IntegrationTypes.xsd | Тип: Общая информация по жалобе |
| `zfcs_complaintGroupType` | IntegrationTypes.xsd | Информация по групповой жалобе |
| `zfcs_complaintModificationType` | IntegrationTypes.xsd | Внесение изменений в документы контрольных реестров |
| `zfcs_complaintObjectType` | IntegrationTypes.xsd | Тип: Предмет жалобы по 44-ФЗ |
| `zfcs_complaintOrderType` | IntegrationTypes.xsd | Тип: Сведения о заказе из жалобы по 94-ФЗ |
| `zfcs_complaintProjectSubjectType` | IntegrationTypes.xsd | Тип: Субъект проекта жалобы |
| `zfcs_complaintPurchaseType` | IntegrationTypes.xsd | Тип: Сведения о закупке из жалобы по 44-ФЗ |
| `zfcs_complaintReturnInfoType` | IntegrationTypes.xsd | Тип: Сведения об отказе в рассмотрении жалобы |
| `zfcs_complaintSubjectType` | IntegrationTypes.xsd | Тип: Субъект жалобы по 44-ФЗ |
| `zfcs_complaintTransferType` | IntegrationTypes.xsd | Информация о передаче жалобы по подведомственности / ведомственной принадлежности |
| `zfcs_complaintType` | IntegrationTypes.xsd | Информация по жалобе |
| `zfcs_confirmationType` | IntegrationTypes.xsd | Результат обработки |
| `zfcs_consRegistryNumRef` | IntegrationTypes.xsd | Тип: Ссылка на организацию в справочнике "Сводный реестр" |
| `zfcs_contactInfoType` | IntegrationTypes.xsd | Контактная информация |
| `zfcs_contactPersonType` | IntegrationTypes.xsd | ФИО |
| `zfcs_contract.attachmentListType` | IntegrationTypes.xsd | Прикрепленные документы для государственного или муниципального контракта |
| `zfcs_contract.attachmentType` | IntegrationTypes.xsd | Прикрепленный документ для государственного или муниципального контракта |
| `zfcs_contract.OKEIType` | IntegrationTypes.xsd | Тип: Ссылка на ОКЕИ в Реестре контрактов |
| `zfcs_contract.printFormType` | IntegrationTypes.xsd | Печатная форма для муниципального или государственного контракта |
| `zfcs_contract2015.DocDictRef` | IntegrationTypes.xsd | Ссылка на документ в справочнике в сведениях о контракте с 01.01.2015 |
| `zfcs_contract2015.documentInfo` | IntegrationTypes.xsd | Документ в сведениях о контракте с 01.01.2015 |
| `zfcs_contract2015.payDocInfo` | IntegrationTypes.xsd | Оплата в сведениях о контракте с 01.01.2015 |
| `zfcs_contract2015BankGuaranteeReturnType` | IntegrationTypes.xsd | Информация о возвращении независимой гарантии или уведомление об освобождении от обязательств по независимой гарантии |
| `zfcs_contract2015ControlNCType` | IntegrationTypes.xsd | Информация (проект информации) о заключенном контракте с 01.01.2015 с уведомлением о соответствии контролируемой информации |
| `zfcs_contract2015DrugPurchaseInfoType` | IntegrationTypes.xsd | Информация об объекте закупки - лекарственном препарате |
| `zfcs_contract2015EnforcementType` | IntegrationTypes.xsd | Тип: Обеспечение исполнения контракта |
| `zfcs_contract2015KTRUCharacteristicValueType` | IntegrationTypes.xsd | Тип: Значение характеристики позиции КТРУ, формируемой с использованием справочной информации (справочник КТРУ) в РК |
| `zfcs_contract2015ParentProductType` | IntegrationTypes.xsd | Тип: Информация об родительском объекте закупки в сведениях о контракте |
| `zfcs_contract2015PriceInfoType` | IntegrationTypes.xsd | Тип: Информация о цене за право заключения контракта для контракта и выжимки контракта |
| `zfcs_contract2015PurchaseObjectInfoType` | IntegrationTypes.xsd | Тип: Информация об объекте закупки в сведениях о контракте |
| `zfcs_contract2015RefKtruCharacteristicType` | IntegrationTypes.xsd | Тип: Характеристика товаров, работ, услуг для ввода из справочника в РК |
| `zfcs_contract2015SingleCustomerNewType` | IntegrationTypes.xsd | Единственный поставщик в информации о контракте с 01.01.01.2015, начиная с версии 13.2 |
| `zfcs_contract2015SingleCustomerType` | IntegrationTypes.xsd | Единственный поставщик в информации о контракте с 01.01.01.2015 |
| `zfcs_contract2015SubContractInfoType` | IntegrationTypes.xsd | Тип: Информация о субподрядном договоре в сведениях о контракте |
| `zfcs_contract2015SupplierInfoType` | IntegrationTypes.xsd | Тип: Информация о поставщике формируется с использованием справочной информации на основании ЕГРЮЛ/ЕГРИП |
| `zfcs_contract2015SupplierType` | IntegrationTypes.xsd | Поставщик в информации о контракте с 01.01.01.2015 |
| `zfcs_contract2015TenderPlanInfoType` | IntegrationTypes.xsd | Информация о плане-графике для реестра контрактов |
| `zfcs_contract2015Type` | IntegrationTypes.xsd | Информация (проект информации) о заключенном контракте с 01.01.2015 |
| `zfcs_contractAvailableForElAct` | IntegrationTypes.xsd | Квитанция о доступности формирования документов электронного актирования по контракту |
| `zfcs_contractBankGuaranteeReturnInvalidType` | IntegrationTypes.xsd | Сведения об исполнении контракта о недействительности информации о возвращении независимой гарантии или об освобождении от обязательств по независимой гарантии (ЦРК) |
| `zfcs_contractBankGuaranteeReturnType` | IntegrationTypes.xsd | Сведения об исполнении контракта о возвращении независимой гарантии гаранту или об уведомлении, направляемом заказчиком гаранту, об отказе от прав по гарантии (ЦРК) |
| `zfcs_contractBankGuaranteeTerminationInvalidType` | IntegrationTypes.xsd | Сведения об исполнении контракта о недействительности информации о прекращении обязательств поставщика по независимой гарантии (ЦРК) |
| `zfcs_contractBankGuaranteeTerminationType` | IntegrationTypes.xsd | Сведения об исполнении контракта по прекращению обязательств поставщика по независимой гарантии (ЦРК) |
| `zfcs_contractCancel2015Type` | IntegrationTypes.xsd | Информация об аннулировании контракта с 01.01.2015 |
| `zfcs_contractCancelType` | IntegrationTypes.xsd | Информация об анулировании контракта |
| `zfcs_contractCorrectionType` | IntegrationTypes.xsd | Корректировка информации о заключенном контракте |
| `zfcs_contractExecutionType` | IntegrationTypes.xsd | Исполнение контракта |
| `zfcs_contractGuaranteePaymentInfoType` | IntegrationTypes.xsd | Тип: Информация о платеже для обеспечения исполнения контракта, начиная с версии ЕИС 9.3 |
| `zfcs_contractMultiType` | IntegrationTypes.xsd | Право заключения контракта с несколькими участниками закупки |
| `zfcs_contractProcedure2015BankGuaranteePaymentType` | IntegrationTypes.xsd | Тип: Информация об уплате по независимой гарантии в информации об исполнении (исполнении обязательств по предоставленной гарантии качества, расторжении) контракта |
| `zfcs_contractProcedure2015BankGuaranteeTerminationType` | IntegrationTypes.xsd | Информация о прекращении обязательств поставщика, обеспеченных независимой гарантией |
| `zfcs_contractProcedure2015ControlNCType` | IntegrationTypes.xsd | Информация об исполнении (исполнении обязательств по предоставленной гарантии качества, расторжении, возврата переплаты по контракту, признании контракта недействительным) контракта с 01.01.2015 с уведомлением о соответствии контролируемой информации |
| `zfcs_contractProcedure2015HoldCashEnforcementType` | IntegrationTypes.xsd | Тип: Сведения об удержании денежных средств, перечисленных в качестве обеспечения исполнения контракта (исполнения обязательств по гарантии качества товаров, работ, услуг) |
| `zfcs_contractProcedure2015ProductsCountryType` | IntegrationTypes.xsd | Тип: Страна происхождения товара, страна производителя в информации об исполненни (исполнении обязательств по предоставленной гарантии качества, расторжении) контракта |
| `zfcs_contractProcedure2015SearchDrugProductsAttrsType` | IntegrationTypes.xsd | Тип: Реквизиты предмета контракта-лекарственного препарата для поиска в исполнении контракта |
| `zfcs_contractProcedure2015SearchProductsAttrsType` | IntegrationTypes.xsd | Тип: Реквизиты предмета контракта для поиска в исполнении контракта |
| `zfcs_contractProcedure2015Type` | IntegrationTypes.xsd | Информация об исполнении (исполнении обязательств по предоставленной гарантии качества, расторжении, возврата переплаты по контракту, признании контракта недействительным) контракта с 01.01.2015 |
| `zfcs_contractProcedureCancel2015Type` | IntegrationTypes.xsd | Сведения об отмене информации об исполнении контракта (расторжении контракта, признании контракта недействительным) с 01.01.2015 |
| `zfcs_contractProcedureCancelType` | IntegrationTypes.xsd | Сведения об отмене информации об исполнении (расторжении) контракта |
| `zfcs_contractProcedureIDsType` | IntegrationTypes.xsd | Информация об идентификаторах исполнения контракта |
| `zfcs_contractProcedureType` | fcsPrintForm.xsd | Расширение типа zfcs_contractProcedureType |
| `zfcs_contractProcedureType` | IntegrationTypes.xsd | Информация об исполнении (расторжении) контракта |
| `zfcs_contractSignType` | IntegrationTypes.xsd | Информация о подписании государственного/муниципального контракта на ЭП |
| `zfcs_contractTerminationReasonType` | IntegrationTypes.xsd | Основание расторжения контракта |
| `zfcs_contractType` | IntegrationTypes.xsd | Информация (проект информации) о заключенном контракте |
| `zfcs_control99BeginMessageType` | IntegrationTypes.xsd | Сообщение о начале контроля |
| `zfcs_control99ConfirmationType` | IntegrationTypes.xsd | Результат обработки документа контроля по 99 статье |
| `zfcs_control99ConfirmType` | IntegrationTypes.xsd | Тип: Сообщение о начале контроля (об отказе в принятии на контроль) |
| `zfcs_control99ContractAttachmentListType` | IntegrationTypes.xsd | Тип: Прикрепленные документы в выжимке контракта для контроля по 99 статье |
| `zfcs_control99ContractExtractType` | IntegrationTypes.xsd | Информация из контракта (исполнения контракта, расторжения контракта) (РК), направляемая на контроль по 99 статье в орган контроля |
| `zfcs_control99ControlAuthorityInfoType` | IntegrationTypes.xsd | Тип: Сведения об органе контроля для контроля по 99 статье |
| `zfcs_control99ControlObjectType` | IntegrationTypes.xsd | Тип: Сведения об объектах контроля по 99 статье |
| `zfcs_control99ControlObjectWithMandatoryDocsInfoType` | IntegrationTypes.xsd | Тип: Сведения об объектах контроля по 99 статье с обязательным блоком controlDocumentsInfo |
| `zfcs_control99ControlResultsIKZType` | IntegrationTypes.xsd | Тип: Сведения о результатах контроля в разбивке по ИКЗ в протоколе о несоответствии контролируемой информации контроля по 99 статье |
| `zfcs_control99ControlResultType` | IntegrationTypes.xsd | Тип: Результат контроля в протоколе о несоответствии контролируемой информации контроля по 99 статье |
| `zfcs_control99CustomerInfoType` | IntegrationTypes.xsd | Тип: Сведения о заказчике в ПЗ/ПГ для контроля по 99 статье |
| `zfcs_control99DocLinkType` | IntegrationTypes.xsd | Тип: Ссылка на карточку документа |
| `zfcs_control99DocumentObjectType` | IntegrationTypes.xsd | Тип: Документ, содержащий информацию об объекте контроля по 99 статье |
| `zfcs_control99ExtPrintFormType` | IntegrationTypes.xsd | Тип: Электронный документ для контроля по 99 статье |
| `zfcs_control99NoticeComplianceType` | IntegrationTypes.xsd | Уведомление о соответствии контролируемой информации |
| `zfcs_control99NoticeComplianceWithDocChecklistType` | IntegrationTypes.xsd | Уведомление о соответствии контролируемой информации, принятое вместе с контролируемым документом и списком проверки |
| `zfcs_control99NoticeComplianceWithDocType` | IntegrationTypes.xsd | Уведомление о соответствии контролируемой информации, принятое вместе с контролируемым документом |
| `zfcs_control99NoticeProtocolCommonInfoType` | IntegrationTypes.xsd | Тип: Общие поля уведомления о соответствии (протокола о несоответствии) контролируемой информации |
| `zfcs_control99NotificationExtractType` | IntegrationTypes.xsd | Информация из извещения (конкурсной документации) (ПРИЗ), направляемая на контроль по 99 статье в орган контроля |
| `zfcs_control99OwnerInfoType` | IntegrationTypes.xsd | Тип: Сведения о владельце версии в ПЗ/ПГ для контроля по 99 статье |
| `zfcs_control99ParamType` | IntegrationTypes.xsd | Тип: Параметр в универсальной выжимке, направляемой на контроль в орган контроля |
| `zfcs_control99ProtocolCommonInfoType` | IntegrationTypes.xsd | Тип: Общие поля протокола о несоответствии контролируемой информации |
| `zfcs_control99ProtocolExtractType` | IntegrationTypes.xsd | Информация из итогового протокола ОППИ (ПРИЗ), направляемая на контроль по 99 статье в орган контроля |
| `zfcs_control99ProtocolMismatchReductFundsType` | IntegrationTypes.xsd | Протокол о несоответствии контролируемой информации в связи с уменьшением средств |
| `zfcs_control99ProtocolMismatchType` | IntegrationTypes.xsd | Протокол о несоответствии контролируемой информации |
| `zfcs_control99PurchasePlanExtractType` | IntegrationTypes.xsd | Информация из плана закупок (РПЗ), направляемая на контроль по 99 статье в орган контроля |
| `zfcs_control99PurchasePlanPositionType` | IntegrationTypes.xsd | Тип: Сведения о позиции плана закупок для контроля по 99 статье |
| `zfcs_control99RefusalMessageType` | IntegrationTypes.xsd | Сообщение об отказе в принятии на контроль |
| `zfcs_control99ResponsibleType` | IntegrationTypes.xsd | Тип: Ответственный исполнитель для контроля по 99 статье |
| `zfcs_control99RiskInfoType` | IntegrationTypes.xsd | Тип: Информация о риске в универсальной выжимке, направляемой на контроль в орган контроля |
| `zfcs_control99TenderPlan2017ExtractType` | IntegrationTypes.xsd | Информация из плана-графика с 01.01.2017 (РПГ), направляемая на контроль по 99 статье в орган контроля |
| `zfcs_control99TenderPlan2017PositionType` | IntegrationTypes.xsd | Тип: Сведения о позиции плана-графика для контроля по 99 статье |
| `zfcs_control99TenderPlan2017SpecialPurchaseType` | IntegrationTypes.xsd | Тип: Сведения об особой закупки плана-графика для контроля по 99 статье |
| `zfcs_control99UnControlAuthInfoType` | IntegrationTypes.xsd | Тип: Сведения об органе контроля в универсальной выжимке, направляемой на контроль в орган контроля |
| `zfcs_control99UnCustomerInfoType` | IntegrationTypes.xsd | Тип: Сведения о заказчике в универсальной выжимке, направляемой на контроль в орган контроля |
| `zfcs_control99UniversalExtractType` | IntegrationTypes.xsd | Универсальная выжимка, направляемая на контроль в орган контроля согласно приказу Минфина России от 30.10.2020 N 258н и ПП РФ от 6 августа 2020 г. N 119 |
| `zfcs_control99UnPurchaseResponsInfoType` | IntegrationTypes.xsd | Тип: Сведения о размещающей организации в универсальной выжимке, направляемой на контроль в орган контроля |
| `zfcs_controlObjectRef` | IntegrationTypes.xsd | Тип: Ссылка на справочник объектов контроля в универсальной выжимке |
| `zfcs_controlRegistersAttachmentListType` | IntegrationTypes.xsd | Тип: Прикрепленные документы для контрольных реестров |
| `zfcs_controlRegistersAttachmentType` | IntegrationTypes.xsd | Тип: Прикрепленный документ для контрольных реестров |
| `zfcs_controlRegistersProlongationInfoType` | IntegrationTypes.xsd | Тип: Продление срока проведения проверки для контрольных реестров |
| `zfcs_countryRef` | IntegrationTypes.xsd | Ссылка на страну |
| `zfcs_criterionType` | IntegrationTypes.xsd | Критерий оценки заявок участников |
| `zfcs_currencyFullRef` | IntegrationTypes.xsd | Ссылка на валюту с цифровым кодом |
| `zfcs_currencyRateContract2015` | IntegrationTypes.xsd | Курс валюты для сведений о контракте |
| `zfcs_currencyRef` | IntegrationTypes.xsd | Тип: Ссылка на ОКВ |
| `zfcs_customerConsentForRMISType` | IntegrationTypes.xsd | Cогласие заказчика на предоставление РИС информации и документов (для формирования печатной формы) |
| `zfcs_customerReportBaseType` | IntegrationTypes.xsd | Общая информация отчета заказчика и недействительности |
| `zfcs_customerReportBigProjectMonitoringInvalidType` | IntegrationTypes.xsd | Информация о недействительности сведений отчета по мониторингу реализации крупных проектов с государственным участием |
| `zfcs_customerReportBigProjectMonitoringType` | IntegrationTypes.xsd | Отчет по мониторингу реализации крупных проектов с государственным участием |
| `zfcs_customerReportContractExecutionInvalidType` | IntegrationTypes.xsd | Информация о недействительности сведений отчета об исполнении контракта (результатах отдельного этапа исполнения контракта) |
| `zfcs_customerReportContractExecutionType` | IntegrationTypes.xsd | Отчет об исполнении контракта (результатах отдельного этапа исполнения контракта) |
| `zfcs_customerReportInvalidType` | IntegrationTypes.xsd | Общая информация о недействительности сведений отчета заказчика |
| `zfcs_customerReportRusProductsPurchasesVolumeInvalidType` | IntegrationTypes.xsd | Информация о недействительности сведений отчета об объеме закупок российских товаров |
| `zfcs_customerReportRusProductsPurchasesVolumeType` | IntegrationTypes.xsd | Отчет об объеме закупок российских товаров |
| `zfcs_customerReportRusProductsWorksServicesVolumeInvalidType` | IntegrationTypes.xsd | Информация о недействительности сведений отчета об объеме закупок товаров российского происхождения, работ, услуг, соответственно выполняемых, оказываемых российскими гражданами, российскими юридическими лицами |
| `zfcs_customerReportRusProductsWorksServicesVolumeType` | IntegrationTypes.xsd | Отчет об объеме закупок товаров российского происхождения, работ, услуг, соответственно выполняемых, оказываемых российскими гражданами, российскими юридическими лицами |
| `zfcs_customerReportSingleContractorInvalidType` | IntegrationTypes.xsd | Информация о недействительности сведений отчета с обоснованием закупки у единственного поставщика (подрядчика, исполнителя) |
| `zfcs_customerReportSingleContractorType` | IntegrationTypes.xsd | Отчет с обоснованием закупки у единственного поставщика (подрядчика, исполнителя) |
| `zfcs_customerReportSmallScaleBusinessInvalidType` | IntegrationTypes.xsd | Информация о недействительности сведений отчета об объеме закупок у СМП (субъектов малого предпринимательства), СОНО (социально ориентированных некоммерческих организаций) |
| `zfcs_customerReportSmallScaleBusinessType` | IntegrationTypes.xsd | Отчет об объеме закупок у СМП (субъектов малого предпринимательства), СОНО (социально ориентированных некоммерческих организаций) |
| `zfcs_customerReportType` | IntegrationTypes.xsd | Общая информация об отчете заказчика |
| `zfcs_customerReportUnstructuredType` | fcsPrintForm.xsd | Отчет заказчика в неструктурированной форме и информация о его недействительности |
| `zfcs_decisionDetailsType` | IntegrationTypes.xsd | Тип: Реквизиты решения о возвращении жалобы |
| `zfcs_decisionRef` | IntegrationTypes.xsd | Решение по общественному обсуждению |
| `zfcs_deviationFactFoundation` | IntegrationTypes.xsd | Тип: Ссылка на справочник Причины признания участника уклонившимся от заключения контракта |
| `zfcs_docCancelReasonType` | IntegrationTypes.xsd | Основание отмены документа |
| `zfcs_docType` | IntegrationTypes.xsd | Тип документа в рамках закупки |
| `zfcs_documentationEAType` | IntegrationTypes.xsd | Тип: Структурированная документация в рамках проведения аукционов в электронной форме |
| `zfcs_documentRequirementType` | IntegrationTypes.xsd | Информация и документы, предусмотренные конкурсной документацией |
| `zfcs_drugInfoType` | IntegrationTypes.xsd | Тип: Сведения о МНН, ТН, лекарственной форме и дозировке |
| `zfcs_drugInfoUsingTextFormType` | IntegrationTypes.xsd | Тип: Сведения о МНН, ТН, лекарственной форме и дозировке в случае когда информация о лекарственных препаратах формируется в текстовой форме |
| `zfcs_edoNsiOperatorInfoType` | IntegrationTypes.xsd | Справочник: Операторы электронного документооборота |
| `zfcs_electronicComplaintType` | IntegrationTypes.xsd | Информация по жалобе, поданной в электронном виде |
| `zfcs_eruzNsiContractorExcludeReasonType` | IntegrationTypes.xsd | Справочник: Основания исключений участника закупки из ЕРУЗ |
| `zfcs_eruzNsiContractorUserRightType` | IntegrationTypes.xsd | Справочник: Права доступа пользователей в ЕРУЗ |
| `zfcs_etpActionRefType` | IntegrationTypes.xsd | Ссылка на справочник "Действия пользователей на электронных площадках" |
| `zfcs_etpPrivilege` | IntegrationTypes.xsd | Привилегии пользователя на ЭП |
| `zfcs_ETPType` | IntegrationTypes.xsd | Тип: Ссылка на справочник Электронные площадки |
| `zfcs_eventPlanProjectType` | IntegrationTypes.xsd | Проект плана контрольных мероприятий |
| `zfcs_eventPlanSuspensionType` | IntegrationTypes.xsd | Информация о приостановке/возобновлении планового контрольного мероприятия |
| `zfcs_eventPlanType` | IntegrationTypes.xsd | План контрольных мероприятий |
| `zfcs_eventResultCancelProjectType` | IntegrationTypes.xsd | Проект информации об отмене результата контроля |
| `zfcs_eventResultCancelType` | IntegrationTypes.xsd | Информация об отмене результата контроля |
| `zfcs_eventResultPlannedCheckType` | IntegrationTypes.xsd | Тип: Информация о плановой проверке в результате контроля |
| `zfcs_eventResultPrescriptionType` | IntegrationTypes.xsd | Тип: Предписание/Представление результата контроля |
| `zfcs_eventResultProjectType` | IntegrationTypes.xsd | Проект результата контроля |
| `zfcs_eventResultType` | IntegrationTypes.xsd | Результат контроля |
| `zfcs_eventResultUnplannedCheckType` | IntegrationTypes.xsd | Тип: Информация о внеплановой проверке в результате контроля |
| `zfcs_extPrintFormType` | IntegrationTypes.xsd | Электронный документ, полученный из внешней системы |
| `zfcs_extraBudgetFundsContract2015` | IntegrationTypes.xsd | Код и наименование вида внебюджетных средств в контракте |
| `zfcs_fcsReportMeasureSuperAuthProcType` | IntegrationTypes.xsd | Тип: Отчет о проведенных мероприятиях контрольным органом в сфере закупок |
| `zfcs_fcsReportMeasureSuperInnerAuthType` | IntegrationTypes.xsd | Тип: Отчет о проведенных мероприятиях органом внутреннего контроля |
| `zfcs_foundationProtocolInfoType` | IntegrationTypes.xsd | Реквизиты предыдущего протокола (для печатной формы) |
| `zfcs_guarantee.attachmentListType` | IntegrationTypes.xsd | Тип: Прикрепленные документы для независимой гарантии |
| `zfcs_guarantee.attachmentType` | IntegrationTypes.xsd | Тип: Прикрепленный документ для независимой гарантии |
| `zfcs_guaranteeType` | IntegrationTypes.xsd | Обеспечение заявки (исполнения контракта) |
| `zfcs_improperContractExecutionType` | IntegrationTypes.xsd | Ненадлежащее исполнение контракта |
| `zfcs_indicatorType` | IntegrationTypes.xsd | Показатель нестоимостного критерия оценки заявок участников |
| `zfcs_infoProtocolZKBIType` | IntegrationTypes.xsd | Информация о протоколе ЗК-БИ |
| `zfcs_invalidReportType` | IntegrationTypes.xsd | Информация о недействительности сведений отчета |
| `zfcs_kladrPlacesType` | IntegrationTypes.xsd | Места доставки ТРУ по КЛАДР |
| `zfcs_kladrType` | IntegrationTypes.xsd | Адрес по КЛАДР |
| `zfcs_KTRUCharacteristicType` | IntegrationTypes.xsd | Тип КТРУ: Характеристика товаров, работ, услуг |
| `zfcs_KTRUCharacteristicValueType` | IntegrationTypes.xsd | Тип КТРУ: Значение характеристики позиции КТРУ, формируемой с использованием справочной информации (справочник Каталог товаров, работ, услуг (КТРУ) (nsiKTRU)). |
| `zfcs_KTRUClassifierType` | IntegrationTypes.xsd | Тип КТРУ: Общероссийский или международный классификатор |
| `zfcs_KTRUIndustryClassifierNodeType` | IntegrationTypes.xsd | Тип КТРУ: Позиция отраслевого классификатора, соответствующая позиции КТРУ |
| `zfcs_KTRUIndustryClassifierType` | IntegrationTypes.xsd | Тип КТРУ: Отраслевой классификатор, соответствующий позиции КТРУ |
| `zfcs_KTRUManualCharacteristicValueType` | IntegrationTypes.xsd | Тип КТРУ: Значение характеристики позиции КТРУ, формируемой в текстовой форме (Тестовое описание 2000 символов) |
| `zfcs_KTRUPositionsType` | IntegrationTypes.xsd | Позиции КТРУ |
| `zfcs_KTRUPositionType` | IntegrationTypes.xsd | Позиция КТРУ |
| `zfcs_KTRURef` | IntegrationTypes.xsd | Тип: Ссылка на КТРУ |
| `zfcs_KTRUSignType` | IntegrationTypes.xsd | Тип КТРУ: Данные подписи |
| `zfcs_KTRUStandartType` | IntegrationTypes.xsd | Тип КТРУ: Информация о техническом регламенте или стандарте |
| `zfcs_KVRRef` | IntegrationTypes.xsd | Ссылка на справочник "Коды видов расходов" (КВР) |
| `zfcs_LBOType` | IntegrationTypes.xsd | Сведения о лимитах бюджетных обязательств (ЛБО), загружаемых из региональных систем финансового учета |
| `zfcs_limitsRequestType` | fcsPrintForm.xsd | Сведения для проверки на соотвествие ЛБО |
| `zfcs_limitsResponseType` | fcsPrintForm.xsd | Протокол проверки на соответствие ЛБО |
| `zfcs_linkUser` | IntegrationTypes.xsd | Список связей "право - пользователь" |
| `zfcs_lotI111Type` | IntegrationTypes.xsd | Информация о лоте для способа по ст. 111 Федерального закона № 44-ФЗ |
| `zfcs_lotInfoType` | IntegrationTypes.xsd | Информация о лоте ОК (для печатной формы) |
| `zfcs_lotISType` | IntegrationTypes.xsd | Информация о лоте для иного способа |
| `zfcs_lotOKType` | IntegrationTypes.xsd | Информация о лоте для конкурсов (открытых и закрытых) |
| `zfcs_lotZKType` | IntegrationTypes.xsd | Информация о лоте для запроса котировок, запроса предложений |
| `zfcs_manufacturerReportCancelType` | IntegrationTypes.xsd | Аннулирование отчета о количестве товара и (или) объеме услуги, соответственно произведенного и (или) оказанной поставщиком (исполнителем), с которым заключен контракт в соответствии со ст.111.3, ст.111.4 Закона №44-ФЗ |
| `zfcs_manufacturerReportNPAType` | IntegrationTypes.xsd | Тип: Информация о нормативно-правовом акте в реестровой записи РЕП |
| `zfcs_manufacturerReportOrganizationType` | IntegrationTypes.xsd | Тип: Данные организации для печатной формы |
| `zfcs_manufacturerReportProductsType` | IntegrationTypes.xsd | Тип: Перечень товаров/услуг отчета |
| `zfcs_manufacturerReportProductType` | IntegrationTypes.xsd | Тип: Сведения о товаре отчета |
| `zfcs_manufacturerReportSupplerInfoType` | IntegrationTypes.xsd | Тип: Информация о поставщике в отчете |
| `zfcs_manufacturerReportType` | IntegrationTypes.xsd | Отчет о количестве товара и (или) объеме услуги, соответственно произведенного и (или) оказанной поставщиком (исполнителем), с которым заключен контракт в соответствии со ст.111.3, ст.111.4 Закона №44-ФЗ |
| `zfcs_masterDataType` | IntegrationTypes.xsd | Набор элементов справочников и классификаторов |
| `zfcs_MNNInfoType` | IntegrationTypes.xsd | Тип: Международное, группировочное или химическое наименование лекарственного препарата (МНН) |
| `zfcs_modifyTerminateContractType` | IntegrationTypes.xsd | Изменение или расторжение контракта в ходе его исполнения |
| `zfcs_nonbudgetFinancingsType` | IntegrationTypes.xsd | План исполнения контракта за счет внебюджетных средств |
| `zfcs_noticeDetailsType` | IntegrationTypes.xsd | Тип: Реквизиты уведомления |
| `zfcs_notificationCancelFailureType` | IntegrationTypes.xsd | Отмена извещения об отмене определения поставщика (подрядчика, исполнителя) (в части лота); |
| `zfcs_notificationCancelType` | fcsPrintForm.xsd | Извещение об отмене определения поставщика (подрядчика, исполнителя) |
| `zfcs_notificationCancelType` | IntegrationTypes.xsd | Извещение об отмене определения поставщика (подрядчика, исполнителя) |
| `zfcs_notificationEFDateChangeType` | IntegrationTypes.xsd | Уведомление об изменении даты и времени проведения электронного аукциона |
| `zfcs_notificationEFType` | IntegrationTypes.xsd | Извещение о проведении ЭА (электронный аукцион); внесение изменений |
| `zfcs_notificationEPType` | IntegrationTypes.xsd | Извещение о проведении закупки у ЕП (единственного поставщика); внесение изменений |
| `zfcs_notificationExceptionOrgType` | IntegrationTypes.xsd | Тип: Организация, осуществившая исключение сведений |
| `zfcs_notificationExceptionType` | IntegrationTypes.xsd | Уведомление об исключении информации и документов с официального сайта ЕИС |
| `zfcs_notificationI111Type` | IntegrationTypes.xsd | Извещение о проведении закупки способом определения поставщика (подрядчика, исполнителя), установленным Правительством Российской Федерации в соответствии со ст. 111 Федерального закона № 44-ФЗ |
| `zfcs_notificationISMType` | IntegrationTypes.xsd | Извещение о проведении закупки многолотовым ИС (иной способ); внесение изменений |
| `zfcs_notificationISOType` | IntegrationTypes.xsd | Извещение о проведении закупки однолотовым ИС (иной способ); внесение изменений |
| `zfcs_notificationLotCancelType` | IntegrationTypes.xsd | Извещение об отмене определения поставщика (подрядчика, исполнителя) в части лота |
| `zfcs_notificationLotChangeType` | IntegrationTypes.xsd | Внесение изменений в извещение в части лота |
| `zfcs_notificationModification111Type` | IntegrationTypes.xsd | Внесение изменений в извещение по ст. 111 Федерального закона № 44-ФЗ |
| `zfcs_notificationModificationType` | IntegrationTypes.xsd | Внесение изменений в извещение |
| `zfcs_notificationOKDType` | IntegrationTypes.xsd | Извещение о проведении OK-Д (двухэтапный конкурс); внесение изменений |
| `zfcs_notificationOKOUType` | IntegrationTypes.xsd | Извещение о проведении OK-ОУ (конкурс с ограниченным участием); внесение изменений |
| `zfcs_notificationOKType` | IntegrationTypes.xsd | Извещение о проведении OK (открытый конкурс); внесение изменений |
| `zfcs_notificationOrgChangeType` | IntegrationTypes.xsd | Уведомление об изменении организации, осуществляющей закупку |
| `zfcs_notificationPOType` | IntegrationTypes.xsd | Извещение о проведении ПО (предварительный отбор) |
| `zfcs_notificationRemoveDocType` | IntegrationTypes.xsd | Тип: Уведомление об удалении из ЕИС проекта документа |
| `zfcs_notificationZakAType` | IntegrationTypes.xsd | Извещение о проведении ЗакА (закрытый аукцион); внесение изменений |
| `zfcs_notificationZakKDType` | IntegrationTypes.xsd | Извещение о проведении ЗакK-Д (закрытый двухэтапный конкурс); внесение изменений |
| `zfcs_notificationZakKOUType` | IntegrationTypes.xsd | Извещение о проведении ЗакK-ОУ (закрытый конкурс с ограниченным участием); внесение изменений |
| `zfcs_notificationZakKType` | IntegrationTypes.xsd | Извещение о проведении ЗакK (закрытый конкурс); внесение изменений |
| `zfcs_notificationZKType` | IntegrationTypes.xsd | Извещение о проведении ЗK (запрос котировок); внесение изменений |
| `zfcs_notificationZPType` | IntegrationTypes.xsd | Извещение о проведении ЗП (запрос предложений); внесение изменений |
| `zfcs_nsiAbandonedReasonType` | IntegrationTypes.xsd | Справочник: Основания признания процедуры несостоявшейся |
| `zfcs_nsiAllListType` | IntegrationTypes.xsd | Справочник: Перечень справочников ЕИС |
| `zfcs_nsiAppleadActionsType` | IntegrationTypes.xsd | Справочник: Обжалуемые действия |
| `zfcs_nsiAuditActionSubjectsType` | IntegrationTypes.xsd | Справочник предметов мероприятий органов аудита |
| `zfcs_nsiBankGuaranteeRefusal223ReasonType` | IntegrationTypes.xsd | Справочник причин отказа в принятии независимой гарантии по 223-ФЗ |
| `zfcs_nsiBankGuaranteeRefusal615ReasonType` | IntegrationTypes.xsd | Справочник причин отказа в принятии независимой гарантии по ПП РФ 615 |
| `zfcs_nsiBankGuaranteeRefusalReasonType` | IntegrationTypes.xsd | Справочник причин отказа в принятии независимой гарантии |
| `zfcs_nsiBudgetType` | IntegrationTypes.xsd | Справочник бюджетов |
| `zfcs_nsiBusinessControlsType` | IntegrationTypes.xsd | Перечень бизнес-контролей для загрузки |
| `zfcs_nsiBusinessControlType` | IntegrationTypes.xsd | Перечень бизнес-контролей для выгрузки |
| `zfcs_nsiCalendarDaysNewType` | IntegrationTypes.xsd | Справочник: Календарь рабочих дней (начиная с 2026 года) |
| `zfcs_nsiCalendarDaysType` | IntegrationTypes.xsd | Справочник: Календарь рабочих дней |
| `zfcs_nsiChangePriceFoundationType` | IntegrationTypes.xsd | Справочник: Обоснование изменения цены контракта в проекте контракта |
| `zfcs_nsiCharacteristicsFillingInstructions` | IntegrationTypes.xsd | Справочник: Инструкции по заполнению характеристик в заявке |
| `zfcs_nsiClosedEPCasesType` | IntegrationTypes.xsd | Справочник: Случаи проведения закрытой электронной процедуры. Не применяется, добавлено на развитие |
| `zfcs_nsiClosedMethodsOfReason` | IntegrationTypes.xsd | Справочник: Основания применения закрытого способа определения поставщика (подрядчика, исполнителя) |
| `zfcs_nsiCommissionRoleType` | IntegrationTypes.xsd | Справочник: Роли членов комиссий |
| `zfcs_nsiCommissionType` | IntegrationTypes.xsd | Справочник: Комиссии по размещению заказа (определению поставщика) |
| `zfcs_nsiComplaintRefusalReasonType` | IntegrationTypes.xsd | Справочник: Основания для отказа в принятии жалобы к рассмотрению по существу |
| `zfcs_nsiContractCurrencyCBRFType` | IntegrationTypes.xsd | Справочник: Список валют, курс на которые устанавливается ЦБ РФ |
| `zfcs_nsiContractExecutionDocType` | IntegrationTypes.xsd | Справочник: Типы документов исполнения контракта |
| `zfcs_nsiContractModificationReasonType` | IntegrationTypes.xsd | Справочник: Причины изменения условий контракта |
| `zfcs_nsiContractOKOPFExtraBudgetType` | IntegrationTypes.xsd | Справочник: Соответствие ОКОПФ видам внебюджетных средств |
| `zfcs_nsiContractPenaltyReasonType` | IntegrationTypes.xsd | Справочник: Причины начисления неустоек (штрафов, пеней) |
| `zfcs_nsiContractPriceChangeReasonType` | IntegrationTypes.xsd | Справочник: Обоснования изменения цены контракта (устарел, не применяется) |
| `zfcs_nsiContractRefusalReasonType` | IntegrationTypes.xsd | Справочник: Основания для отказа от заключения контракта |
| `zfcs_nsiContractReparationDocType` | IntegrationTypes.xsd | Справочник: Типы документов, являющиеся основанием для начисления суммы возмещения фактически понесенного ущерба |
| `zfcs_nsiContractSingleCustomerReasonType` | IntegrationTypes.xsd | Справочник: Основания заключения контракта с единственным поставщиком |
| `zfcs_nsiContractStructureChangeCauseLinkType` | IntegrationTypes.xsd | Справочник: Матрица соответствия оснований изменения условий контракта редактируемым полям ПЭК |
| `zfcs_nsiContractTerminationReasonType` | IntegrationTypes.xsd | Справочник: Основания расторжения контракта |
| `zfcs_nsiControl99SubjectOrgType` | IntegrationTypes.xsd | Тип: Реквизиты организации, являющаяся заказчиком, для субъекта контроля по 99 статье |
| `zfcs_nsiControl99SubjectType` | IntegrationTypes.xsd | Справочник: Субъект контроля по 99 статье |
| `zfcs_nsiControlObjectsType` | IntegrationTypes.xsd | Тип: Справочник: Объекты контроля в универсальной выжимке. Устарело, не применяется |
| `zfcs_nsiCRInvestmentProjectType` | IntegrationTypes.xsd | Справочник: Инвестиционные проекты |
| `zfcs_nsiCurrencyRatesType` | IntegrationTypes.xsd | Справочник: Курсы иностранных валют |
| `zfcs_nsiCurrencyType` | IntegrationTypes.xsd | Общероссийский классификатор валют (ОКВ) |
| `zfcs_nsiDeviationFactFoundationType` | IntegrationTypes.xsd | Справочник: Причины признания участника уклонившимся от заключения контракта |
| `zfcs_nsiDocRejectReasonType` | IntegrationTypes.xsd | Справочник: Причины отказа в предоставлении документации о закупке. Не применяется, добавлено на развитие |
| `zfcs_nsiDocumentTypesType` | IntegrationTypes.xsd | Справочник: Типы документов ЕИС 44ФЗ |
| `zfcs_nsiDrugChangeReason` | IntegrationTypes.xsd | Справочник: "Причины корректировки справочных данных о лекарственных препаратах" |
| `zfcs_nsiDrugOKEIType` | IntegrationTypes.xsd | Справочник: Единицы измерения потребительских единиц измерения лекарственных препаратов по ОКЕИ |
| `zfcs_nsiEADocType` | IntegrationTypes.xsd | Справочник: Виды документов электронного актирования |
| `zfcs_nsiEAESCountry` | IntegrationTypes.xsd | Справочник: Страны ЕАЭС |
| `zfcs_nsiEAESIndustrialGoodsType` | IntegrationTypes.xsd | Справочник: Евразийский реестр промышленных товаров государств - членов Евразийского экономического союза |
| `zfcs_nsiEAESSoftwaresType` | IntegrationTypes.xsd | Справочник: Реестр евразийского программного обеспечения (ПО) |
| `zfcs_nsiEATaxesType` | IntegrationTypes.xsd | Справочник: Налоги и взносы |
| `zfcs_nsiEMInfoType` | IntegrationTypes.xsd | Справочник: Перечень информационных систем, являющихся электронными магазинами |
| `zfcs_nsiEPDocType` | IntegrationTypes.xsd | Справочник: Виды документов электронных процедур с 01.04.2021. Не применяется, добавлено на развитие |
| `zfcs_nsiEtpActionType` | IntegrationTypes.xsd | Справочник: Действия пользователей на электронных площадках |
| `zfcs_nsiETPType` | IntegrationTypes.xsd | Справочник: Электронные площадки |
| `zfcs_nsiEvalCriterionType` | IntegrationTypes.xsd | Справочник: Критерии оценки заявки |
| `zfcs_nsiEvasDevFactFoundationType` | IntegrationTypes.xsd | Справочник: Основания отказа (принятия решения) для ПОК и ППУ с 01.01.2021 |
| `zfcs_nsiFarmDrugDictionary` | IntegrationTypes.xsd | Справочник: "Лекарственные препараты" |
| `zfcs_nsiFarmDrugDictionaryShortType` | IntegrationTypes.xsd | Справочник: Лекарственные препараты (сокращенный) |
| `zfcs_nsiFarmDrugDosageInfoType` | IntegrationTypes.xsd | Тип:Дозировки для справочника "Лекарственные препараты" |
| `zfcs_nsiFarmDrugInterchangeGroup` | IntegrationTypes.xsd | Справочник "Группы взаимозаменяемости лекарственных препаратов" |
| `zfcs_nsiFarmDrugInterchangeGroupInfo` | IntegrationTypes.xsd | Тип: Сведения о группе взаимозаменяемости лекарственных препаратов |
| `zfcs_nsiFarmDrugPositionsTradeNameType` | IntegrationTypes.xsd | Справочник: Позиции по торговому наименованию лекарственного средства |
| `zfcs_nsiFarmMedicamentalFormType` | IntegrationTypes.xsd | Справочник: Лекарственные формы |
| `zfcs_nsiFineReasonType` | IntegrationTypes.xsd | Справочник: Основания для начисления штрафов |
| `zfcs_nsiGroupBuildType` | IntegrationTypes.xsd | Справочник: Группы работ по строительству |
| `zfcs_nsiKBKBudgetType` | IntegrationTypes.xsd | Справочник КБК-бюджеты |
| `zfcs_nsiKLADRType` | IntegrationTypes.xsd | Справочник: Классификатор адресов Российской Федерации (КЛАДР) |
| `zfcs_nsiKOKSType` | IntegrationTypes.xsd | Справочник: Классификатор объектов капитального строительства (КОКС) |
| `zfcs_nsiKOSGUType` | IntegrationTypes.xsd | Классификатор операций сектора государственного управления (КОСГУ) |
| `zfcs_nsiKRKSType` | IntegrationTypes.xsd | Справочник: Книга регистрации казначейских счетов (КРКС) |
| `zfcs_nsiKRLSType` | IntegrationTypes.xsd | Справочник: Книга регистрации лицевых счетов (КРЛС) |
| `zfcs_nsiKTRUNotUsingReasonType` | IntegrationTypes.xsd | Справочник : Причины неприменения ЕИ, указанной в КТРУ при описании объекта закупки в РК |
| `zfcs_nsiKTRUType` | IntegrationTypes.xsd | Справочник: Каталог товаров, работ, услуг (КТРУ) |
| `zfcs_nsiKVRForGOZType` | IntegrationTypes.xsd | Справочник: Коды КВР, при указании которых обязательная установка признака ГОЗ |
| `zfcs_nsiKVRType` | IntegrationTypes.xsd | Коды видов расходов (КВР) |
| `zfcs_nsiLegalEntitiesKindsType` | IntegrationTypes.xsd | Справочник: Принадлежность к виду юридического лица |
| `zfcs_nsiManualClassifierType` | IntegrationTypes.xsd | Справочник: Пользовательские (ручные) классификаторы КТРУ |
| `zfcs_nsiModifyReasonOZType` | IntegrationTypes.xsd | Cправочник: Причины изменения (расторжения) контрактов для отчетов заказчиков |
| `zfcs_nsiNationalProject` | IntegrationTypes.xsd | Справочник: Коды национальных проектов |
| `zfcs_nsiNKMIType` | IntegrationTypes.xsd | Справочник: Номенклатурная классификация медицинских изделий (НКМИ). Устарело, не применяется |
| `zfcs_nsiOffBudgetType` | IntegrationTypes.xsd | Справочник: Виды внебюджетных средств |
| `zfcs_nsiOKDPGroupType` | IntegrationTypes.xsd | Справочник: Cправочник номенклатуры товаров, работ, услуг для нужд заказчиков |
| `zfcs_nsiOKEIType` | IntegrationTypes.xsd | Общероссийский классификатор единиц измерения (ОКЕИ) |
| `zfcs_nsiOKFSType` | IntegrationTypes.xsd | Тип: Справочник: Общероссийский классификатор форм собственности (ОКФС) (nsiOKFS) |
| `zfcs_nsiOKOGUType` | IntegrationTypes.xsd | Общероссийский классификатор органов государственной власти и управления (ОКОГУ) |
| `zfcs_nsiOKOPFType` | IntegrationTypes.xsd | Общероссийский классификатор организационно-правовых форм (ОКОПФ) |
| `zfcs_nsiOKPD2RequirementType` | IntegrationTypes.xsd | Справочник: ОКПД2, связанные с видами требований запрет или ограничение |
| `zfcs_nsiOKPD2Type` | IntegrationTypes.xsd | Общероссийский классификатор продукции по видам экономической деятельности ОК 034-2014 (ОКПД2) |
| `zfcs_nsiOKPDType` | IntegrationTypes.xsd | Общероссийский классификатор продукции по видам экономической деятельности (ОКПД) |
| `zfcs_nsiOKSMType` | IntegrationTypes.xsd | Общероссийский классификатор стран мира (ОКСМ) |
| `zfcs_nsiOKTMOPPOType` | IntegrationTypes.xsd | Публично-правовые образования (ОКТМО ППО) |
| `zfcs_nsiOKTMOType` | IntegrationTypes.xsd | Общероссийский классификатор территорий муниципальных образований (ОКТМО) |
| `zfcs_nsiOKVED2Type` | IntegrationTypes.xsd | Общероссийский классификатор видов экономической деятельности ОК 029-2014 (ОКВЭД2) |
| `zfcs_nsiOKVEDType` | IntegrationTypes.xsd | Общероссийский классификатор видов экономической деятельности (ОКВЭД) |
| `zfcs_nsiOpenDataType` | IntegrationTypes.xsd | Справочник: Информация и документы, размещаемые в ЕИС, в формате открытых данных |
| `zfcs_nsiOrderEvalIndicators` | IntegrationTypes.xsd | Справочник: Порядок оценки по показателю |
| `zfcs_nsiOrganizationAuthoritiesType` | IntegrationTypes.xsd | Справочник: Полномочия СВР и ЕСИА организаций |
| `zfcs_nsiOrganizationExtractType` | IntegrationTypes.xsd | Справочник: Краткие сведения организаций 44ФЗ |
| `zfcs_nsiOrganizationRightsType` | IntegrationTypes.xsd | Права организаций на осуществление закупок от имени других организаций |
| `zfcs_nsiOrganizationShortType` | IntegrationTypes.xsd | Справочник: Краткие сведения об организации |
| `zfcs_nsiOrganizationType` | IntegrationTypes.xsd | Справочник организаций |
| `zfcs_nsiOrganizationTypesType` | IntegrationTypes.xsd | Справочник: Типы организаций |
| `zfcs_nsiOrgTypeKVRLinkType` | IntegrationTypes.xsd | Тип: Перечень КВР, требующих обязательного ввода КОКС |
| `zfcs_nsiParticipantExperiences` | IntegrationTypes.xsd | Справочник: Опыт участника закупки поставки товара, выполнения работы, оказания услуги |
| `zfcs_nsiPlacingWayType` | IntegrationTypes.xsd | Справочник: Способы размещения заказа (определения поставщика) |
| `zfcs_nsiPlanPositionChangeReasonType` | IntegrationTypes.xsd | Справочник: Обоснования внесения изменений в позицию плана-графика |
| `zfcs_nsiPrefRateType` | IntegrationTypes.xsd | Справочник: Варианты размера преференциальной ставки |
| `zfcs_nsiPrescriptionType` | IntegrationTypes.xsd | Справочник: Типы предписаний |
| `zfcs_nsiProductType` | IntegrationTypes.xsd | Справочник: ОКПД (устаревший, используется ОЧ) |
| `zfcs_nsiPublicDiscussionDecisionsType` | IntegrationTypes.xsd | Справочник: Решения общественного обсуждения и основания решений |
| `zfcs_nsiPublicDiscussionQuestionnarieType` | IntegrationTypes.xsd | Справочник: Аспекты обсуждений, вопросы анкеты и варианты ответов |
| `zfcs_nsiPurchaseDocumentTypesType` | IntegrationTypes.xsd | Справочник: Типы документов |
| `zfcs_nsiPurchaseObjectChars` | IntegrationTypes.xsd | Справочник: Характеристики объекта закупки |
| `zfcs_nsiPurchasePlanPositionChangeReasonType` | IntegrationTypes.xsd | Cправочник: Обоснования внесения изменений в позицию плана закупок |
| `zfcs_nsiPurchasePreferencesType` | IntegrationTypes.xsd | Преимущества при осуществлении закупок (требования, ограничения) |
| `zfcs_nsiPurchaseRejectReasonType` | IntegrationTypes.xsd | Справочник причин отказа в допуске заявок |
| `zfcs_nsiQualPurchaseParticipants` | IntegrationTypes.xsd | Справочник: Квалификация участников закупки |
| `zfcs_nsiReceiptCodesType` | IntegrationTypes.xsd | Справочник: Коды поступлений для АУ/БУ |
| `zfcs_nsiRFHardwaresType` | IntegrationTypes.xsd | Справочник: Реестр российских программно-аппаратных комплексов (ПАК) |
| `zfcs_nsiRFIndustrialGoodsType` | IntegrationTypes.xsd | Справочник: Реестр российской промышленной продукции |
| `zfcs_nsiRFSoftwaresType` | IntegrationTypes.xsd | Справочник: Реестр российского программного обеспечения (ПО) |
| `zfcs_nsiRightSideKTRUType` | IntegrationTypes.xsd | Справочник: Правые части каталога товаров, работ, услуг (КТРУ) |
| `zfcs_nsiRMISType` | IntegrationTypes.xsd | Перечень информационных систем (для формирования печатной формы) |
| `zfcs_nsiRNPOthersType` | IntegrationTypes.xsd | Справочник: Типы иных лиц, добавляемых в РНП |
| `zfcs_nsiRubricatorType` | IntegrationTypes.xsd | Справочник: Рубрикаторы КТРУ |
| `zfcs_nsiSingleCustomerReasonOZType` | IntegrationTypes.xsd | Cправочник: Причины заключения контракта с единственным поставщиком в отчетах заказчиков |
| `zfcs_nsiSpecialPurchase2020Type` | IntegrationTypes.xsd | Cправочник: Типы особых закупок для планов-графиков закупок с 01.01.2020 |
| `zfcs_nsiSpecialPurchaseType` | IntegrationTypes.xsd | Cправочник: Типы особых закупок для планов закупок и планов-графиков с 01.01.2017 |
| `zfcs_nsiSubjectOrgTypesType` | IntegrationTypes.xsd | Справочник: Тип субъекта контроля |
| `zfcs_nsiSubjectRFType` | IntegrationTypes.xsd | Справочник: Субъекты Российской Федерации |
| `zfcs_nsiSupplierStatusType` | IntegrationTypes.xsd | Справочник: Наименования статусов поставщика |
| `zfcs_nsiSVRType` | IntegrationTypes.xsd | Тип: Справочник: Сводный реестр (СВР) |
| `zfcs_nsiTenderPlan2017ContractLifeCycleCaseType` | IntegrationTypes.xsd | Справочник: Случаи заключения контракта жизненного цикла |
| `zfcs_nsiTenderPlan2017PositionChangeReasonType` | IntegrationTypes.xsd | Справочник: Обоснования внесения изменений в позицию плана-графика с 01.01.2017 |
| `zfcs_nsiTenderPlan2020PositionChangeReasonType` | IntegrationTypes.xsd | Cправочник: Причины внесения изменений в позицию ПГ 2020 |
| `zfcs_nsiTenderPlanPurchaseGroupType` | IntegrationTypes.xsd | Справочник групп преимуществ (требований) для плана-графика |
| `zfcs_nsiTRUAdmissionNPA` | IntegrationTypes.xsd | Справочник: НПА, регулирующие допуск товаров, работ, услуг, происходящих из иностранных государств |
| `zfcs_nsiTSCRemovingReasonsType` | IntegrationTypes.xsd | Справочник: Причины снятия требования казначейского сопровождения контракта |
| `zfcs_nsiTSTermsType` | IntegrationTypes.xsd | Справочник: Условия о казначейском сопровождении |
| `zfcs_nsiURDocTypesType` | IntegrationTypes.xsd | Справочник: Типы документов одностороннего отказа и претензионной переписки по результатам электронных процедур |
| `zfcs_nsiUserType` | IntegrationTypes.xsd | Справочник пользователей |
| `zfcs_nsiVATType` | IntegrationTypes.xsd | Справочник: Ставки НДС |
| `zfcs_nsiWorldTimeZoneType` | IntegrationTypes.xsd | Cправочник: Часовые зоны мира для ЕРУЗ |
| `zfcs_nsiWriteOffPenaltyReasonsRefType` | IntegrationTypes.xsd | Тип: Ссылка на справочник Оснований списания неустоек (штрафов, пеней) для реестра контрактов (РК) |
| `zfcs_nsiWriteOffPenaltyReasonsType` | IntegrationTypes.xsd | Справочник: Основания списания неустоек (штрафов, пеней) для реестра контрактов (РК) |
| `zfcs_OKATORef` | IntegrationTypes.xsd | Ссылка на ОКАТО |
| `zfcs_OKEIRef` | IntegrationTypes.xsd | Тип: Ссылка на ОКЕИ |
| `zfcs_OKFSRef` | IntegrationTypes.xsd | Тип: Ссылка на ОКФС |
| `zfcs_okopfRef` | IntegrationTypes.xsd | Тип: Ссылка на ОКОПФ |
| `zfcs_OKPD2Ref` | IntegrationTypes.xsd | Тип: Ссылка на ОКПД2 |
| `zfcs_OKPDRef` | IntegrationTypes.xsd | Ссылка на ОКПД |
| `zfcs_OKPORef` | IntegrationTypes.xsd | Ссылка на ОКПО |
| `zfcs_OKSMRef` | IntegrationTypes.xsd | Тип: Ссылка на ОКСМ |
| `zfcs_OKTMOPPORef` | IntegrationTypes.xsd | Тип: Ссылка на ОКТМО ППО (Справочник ZAKUPKI_DEV.NSI_PPO) |
| `zfcs_OKTMORef` | IntegrationTypes.xsd | Тип: Ссылка на ОКТМО |
| `zfcs_OKVEDRef` | IntegrationTypes.xsd | Ссылка на ОКВЕД |
| `zfcs_orderDetailsType` | IntegrationTypes.xsd | Тип: Реквизиты приказа |
| `zfcs_organizationBudgetsType` | IntegrationTypes.xsd | Бюджеты организации |
| `zfcs_organizationControlRegistersRef` | IntegrationTypes.xsd | Ссылка на организацию для контрольных реестров |
| `zfcs_organizationInfoExtendedType` | IntegrationTypes.xsd | Сведения об организации с расширенным перечнем реквизитов |
| `zfcs_organizationInfoForZCType` | IntegrationTypes.xsd | Сведения об организации для документов Запроса цен |
| `zfcs_organizationInfoType` | fcsPrintForm.xsd | Информация об организации |
| `zfcs_organizationInfoType` | IntegrationTypes.xsd | Сведения об организации |
| `zfcs_organizationInfoWithAddressType` | IntegrationTypes.xsd | Сведения об организации с указанием адреса |
| `zfcs_organizationInfoWithOgrnType` | fcsPrintForm.xsd | Сведения об организации с указанием ОГРН |
| `zfcs_organizationInfoWithOgrnType` | IntegrationTypes.xsd | Сведения об организации с указанием ОГРН |
| `zfcs_organizationLink` | IntegrationTypes.xsd | Подчиненные организации в праве осушествления закупок |
| `zfcs_organizationRef` | IntegrationTypes.xsd | Тип: Ссылка на организацию с учетом кодов по СПЗ и по СвР |
| `zfcs_participantType` | IntegrationTypes.xsd | Поставщик |
| `zfcs_paymentInfoType` | IntegrationTypes.xsd | Информация о платеже для обеспечения заявки (исполнения контракта) или за предоставление документации |
| `zfcs_penalty.documentInfoList` | IntegrationTypes.xsd | Сведения о документах неустоек/пеней/штрафов |
| `zfcs_periodType` | IntegrationTypes.xsd | Тип: Период плановой и внеплановой проверки, ревизии, обследования |
| `zfcs_placementResultType` | IntegrationTypes.xsd | Результат проведения процедуры определения поставщика |
| `zfcs_placingWayType` | IntegrationTypes.xsd | Тип: Подспособ определения поставщика |
| `zfcs_plannedCheckCheckedObjectType` | IntegrationTypes.xsd | Тип: Предмет проверки в плановой проверке |
| `zfcs_planPositionChangeReasonRef` | IntegrationTypes.xsd | Ссылка на причину изменения позиции плана-графика |
| `zfcs_PositionKBK2016sYearsType` | IntegrationTypes.xsd | Суммы в разбивке по КБК 2016 и по годам |
| `zfcs_PositionKBKsYearsType` | IntegrationTypes.xsd | Суммы в разбивке по КБК и по годам |
| `zfcs_PositionKOSGUsYearsType` | IntegrationTypes.xsd | Суммы в разбивке по КОСГУ и по годам |
| `zfcs_PositionKVRsYearsType` | IntegrationTypes.xsd | Суммы в разбивке по КВР и по годам |
| `zfcs_positionTradeNameType` | IntegrationTypes.xsd | Тип: Позиция по торговому наименованию лекарственного средства |
| `zfcs_preferenseType` | IntegrationTypes.xsd | Тип: Преимущество для участников |
| `zfcs_printFormType` | IntegrationTypes.xsd | Печатная форма |
| `zfcs_productsWorksServicesVolumeInfoType` | IntegrationTypes.xsd | Информация об объеме закупок товара (работ, услуг выполняемых, оказываемых российскими гражданами, российскими ЮЛ) |
| `zfcs_projectIncomingConfirmationType` | IntegrationTypes.xsd | Результат обработки для приема проектов бесшовной интеграции |
| `zfcs_protocolCancelReasonType` | IntegrationTypes.xsd | Основание отмены протокола |
| `zfcs_protocolCancelType` | fcsPrintForm.xsd | Информация об отмене протокола (со сведениями для печатной формы) |
| `zfcs_protocolCancelType` | IntegrationTypes.xsd | Информация об отмене протокола |
| `zfcs_protocolDeviationType` | IntegrationTypes.xsd | Протокол признания участника уклонившимся от заключения контракта |
| `zfcs_protocolEF1Type` | IntegrationTypes.xsd | Протокол рассмотрения заявок на участие в электронном аукционе |
| `zfcs_protocolEF2Type` | IntegrationTypes.xsd | Протокол проведения электронного аукциона |
| `zfcs_protocolEF3Type` | IntegrationTypes.xsd | Протокол подведения итогов электронного аукциона |
| `zfcs_protocolEFInvalidationType` | IntegrationTypes.xsd | Протокол о признании электронного аукциона несостоявшимся |
| `zfcs_protocolEFSingleAppType` | IntegrationTypes.xsd | Протокол рассмотрения единственной заявки на участие в электронном аукционе |
| `zfcs_protocolEFSinglePartType` | IntegrationTypes.xsd | Протокол рассмотрения заявки единственного участника электронного аукциона |
| `zfcs_protocolEvasionType` | IntegrationTypes.xsd | Протокол об отказе от заключения контракта |
| `zfcs_protocolModificationReasonType` | IntegrationTypes.xsd | Основание внесения исправлений в протокол |
| `zfcs_protocolModificationType` | IntegrationTypes.xsd | Внесение исправлений в протокол |
| `zfcs_protocolOK1Type` | IntegrationTypes.xsd | Протокол вскрытия конвертов с заявками на участие в ОК |
| `zfcs_protocolOK2Type` | IntegrationTypes.xsd | Протокол рассмотрения и оценки заявок на участие в конкурсе в ОК |
| `zfcs_protocolOKD1Type` | IntegrationTypes.xsd | Протокол вскрытия конвертов и открытия доступа к электронным документам первоначальных заявок в ОК-Д |
| `zfcs_protocolOKD2Type` | IntegrationTypes.xsd | Протокол предквалификационного отбора в ОК-Д |
| `zfcs_protocolOKD3Type` | IntegrationTypes.xsd | Протокол первого этапа в ОК-Д |
| `zfcs_protocolOKD4Type` | IntegrationTypes.xsd | Протокол вскрытия конвертов и открытия доступа к электронным документам окончательных заявок в ОК-Д |
| `zfcs_protocolOKD5Type` | IntegrationTypes.xsd | Протокол рассмотрения и оценки заявок на участие в конкурсе в ОК-Д |
| `zfcs_protocolOKDSingleAppType` | IntegrationTypes.xsd | Протокол рассмотрения единственной заявки в ОК-Д |
| `zfcs_protocolOKOU1Type` | IntegrationTypes.xsd | Протокол вскрытия конвертов и открытия доступа к электронным документам заявок участников в ОК-ОУ |
| `zfcs_protocolOKOU2Type` | IntegrationTypes.xsd | Протокол предквалификационного отбора в ОК-ОУ |
| `zfcs_protocolOKOU3Type` | IntegrationTypes.xsd | Протокол рассмотрения и оценки заявок на участие в конкурсе в ОК-ОУ |
| `zfcs_protocolOKOUSingleAppType` | IntegrationTypes.xsd | Протокол рассмотрения единственной заявки в ОК-ОУ |
| `zfcs_protocolOKSingleAppType` | IntegrationTypes.xsd | Протокол рассмотрения единственной заявки в ОК |
| `zfcs_protocolPOType` | IntegrationTypes.xsd | Протокол предварительного отбора в ПО |
| `zfcs_protocolZKAfterProlongType` | IntegrationTypes.xsd | Протокол рассмотрения и оценки заявок по результатам продления срока подачи заявок в ЗК |
| `zfcs_protocolZKBIAfterProlongType` | IntegrationTypes.xsd | Протокол рассмотрения и оценки заявок на участие в ЗК-БИ по результатам продления срока подачи заявок; внесение изменений |
| `zfcs_protocolZKBIType` | IntegrationTypes.xsd | Общая информация об объекте закупки и структурированный протокол рассмотрения и оценки заявок на участие в ЗК-БИ (запрос котировок без извещения); внесение изменений |
| `zfcs_protocolZKType` | IntegrationTypes.xsd | Протокол рассмотрения и оценки заявок в ЗК |
| `zfcs_protocolZPExtractType` | IntegrationTypes.xsd | Протокол выписки из протокола проведения запроса предложений в ЗП |
| `zfcs_protocolZPFinalType` | IntegrationTypes.xsd | Итоговый протокол в ЗП |
| `zfcs_protocolZPType` | IntegrationTypes.xsd | Протокол проведения запроса предложений в ЗП |
| `zfcs_publicDiscussionAnswerType` | IntegrationTypes.xsd | Ответ на комментарий ООКЗ |
| `zfcs_publicDiscussionAuthorType` | IntegrationTypes.xsd | Автор в комментариях (ответах на комментарии) ООКЗ |
| `zfcs_publicDiscussionCommentType` | IntegrationTypes.xsd | Комментарий ООКЗ |
| `zfcs_publicDiscussionCommonInfo2016Type` | IntegrationTypes.xsd | Общая информация в ООКЗ |
| `zfcs_publicDiscussionCommonInfoType` | IntegrationTypes.xsd | Общая информация в ООКЗ |
| `zfcs_publicDiscussionDecisionRef` | IntegrationTypes.xsd | Ссылка на решение общественного обсуждения |
| `zfcs_publicDiscussionFacetRef` | IntegrationTypes.xsd | Ссылка на аспект общественного обсуждений |
| `zfcs_publicDiscussionFormType` | IntegrationTypes.xsd | Анкета ООКЗ |
| `zfcs_publicDiscussionFoundationRef` | IntegrationTypes.xsd | Ссылка на основание результата общественного обсуждения |
| `zfcs_publicDiscussionLargePurchase2016Type` | IntegrationTypes.xsd | Информация об обязательном общественном обсуждения крупной закупки (ООКЗ) |
| `zfcs_publicDiscussionLargePurchasePhase1Type` | IntegrationTypes.xsd | Информация о первом этапе обязательного общественного обсуждения крупной закупки (ООКЗ) |
| `zfcs_publicDiscussionLargePurchasePhase2Type` | IntegrationTypes.xsd | Информация о втором этапе обязательного общественного обсуждения крупной закупки (ООКЗ) |
| `zfcs_publicDiscussionPhase1SuspensionType` | IntegrationTypes.xsd | Приостановление/возобновление первого этапа ООКЗ |
| `zfcs_publicDiscussionPhase1Type` | IntegrationTypes.xsd | Первый этап ООКЗ |
| `zfcs_publicDiscussionPhase2SuspensionType` | IntegrationTypes.xsd | Приостановление/возобновление второго этапа ООКЗ |
| `zfcs_publicDiscussionPhase2Type` | IntegrationTypes.xsd | Второй этап ООКЗ |
| `zfcs_publicDiscussionPhases2016Type` | IntegrationTypes.xsd | Этап ООКЗ |
| `zfcs_publicDiscussionProtocol2016Type` | IntegrationTypes.xsd | Протокол этапа ООКЗ |
| `zfcs_publicDiscussionProtocolType` | IntegrationTypes.xsd | Протокол этапа ООКЗ |
| `zfcs_publicDiscussionPurchaseAddInfo2016Type` | IntegrationTypes.xsd | Дополнительные сведения о позиции плана-графика и закупке в ООКЗ |
| `zfcs_publicDiscussionPurchasePlanAddInfoType` | IntegrationTypes.xsd | Сведения о позиции плана закупок (плана графика закупок с 01.01.2020) в ООКЗ |
| `zfcs_publicDiscussionQuestionRef` | IntegrationTypes.xsd | Ссылка на вопрос аспекта общественного обсуждений |
| `zfcs_publicDiscussionRegionMunicipalType` | fcsPrintForm.xsd | Информация о проведении обязательного общественного обсуждения закупок для обеспечения нужд субъектов РФ и муниципальных нужд |
| `zfcs_publicDiscussionSuspension2016Type` | IntegrationTypes.xsd | Приостановление/возобновление ООКЗ |
| `zfcs_publicDiscussionType` | IntegrationTypes.xsd | Информация об общественном обсуждении по лоту закупки |
| `zfcs_purchaseApprovalType` | IntegrationTypes.xsd | Квитанция согласования публикации |
| `zfcs_purchaseBOBudgetFinancingsType` | IntegrationTypes.xsd | Тип: План оплаты исполнения контракта |
| `zfcs_purchaseBOBudgetFinancingType` | IntegrationTypes.xsd | Тип: Запись плана исполнения контракта за счет бюджетных средств |
| `zfcs_purchaseBOInfoType` | IntegrationTypes.xsd | Тип: Информация о бюджетном обязательстве в требованиях заказчика |
| `zfcs_purchaseCancelReasonType` | IntegrationTypes.xsd | Основание отмены определения поставщика |
| `zfcs_purchaseChangeType` | IntegrationTypes.xsd | Основание внесения изменений в закупку/отмены закупки |
| `zfcs_purchaseDocumentCancelType` | IntegrationTypes.xsd | Информация об отмене документа закупки |
| `zfcs_purchaseDocumentCommonType` | IntegrationTypes.xsd | Общая информация о документе закупки |
| `zfcs_purchaseDocumentType` | IntegrationTypes.xsd | Информация о документе закупки |
| `zfcs_purchaseDrugPurchaseObjectsInfoType` | IntegrationTypes.xsd | Тип: Сведения об объектах закупки в том случае, когда объектами закупки являются лекарственные препараты (ПРИЗ) |
| `zfcs_purchaseNotification111Type` | IntegrationTypes.xsd | Общая информация об извещении о проведении закупки способом определения поставщика (подрядчика, исполнителя), установленным Правительством Российской Федерации в соответствии со ст. 111 Федерального закона № 44-ФЗ |
| `zfcs_purchaseNotificationISType` | IntegrationTypes.xsd | Общая информация об извещении по закупке по иному способу |
| `zfcs_purchaseNotificationType` | IntegrationTypes.xsd | Общая информация об извещении по закупке |
| `zfcs_purchaseOrganizationType` | IntegrationTypes.xsd | Данные организации для печатной формы |
| `zfcs_purchasePlanAddInfoType` | IntegrationTypes.xsd | Дополнительная информация в планах закупок |
| `zfcs_purchasePlanAgreementTotalsInfoType` | IntegrationTypes.xsd | Тип: Итоговый показатель по соглашениям о предоставлении субсидий |
| `zfcs_purchasePlanChangeType` | IntegrationTypes.xsd | Изменение плана закупок в структурированной форме |
| `zfcs_purchasePlanCommonInfoType` | IntegrationTypes.xsd | Общие сведения плана закупок |
| `zfcs_purchasePlanExecutionType` | IntegrationTypes.xsd | Исполнение плана закупок в структурированной форме |
| `zfcs_purchasePlanFinanceResourcesType` | IntegrationTypes.xsd | Финансовое обеспечение закупки для плана закупок |
| `zfcs_purchasePlanKBKsInfoType` | IntegrationTypes.xsd | Тип: Детализация по кодам бюджетной классификации |
| `zfcs_purchasePlanKBKsTotalsInfoType` | IntegrationTypes.xsd | Тип: Итоговые показатели ПЗ по кодам бюджетной классификации |
| `zfcs_purchasePlanKVRRefType` | IntegrationTypes.xsd | Классификация по КВР в планах закупок и в планах графиках с 01.01.2017 |
| `zfcs_purchasePlanLegalActsType` | IntegrationTypes.xsd | Реквизиты НПА, устанавливающий требования к отдельным видам товаров, работ, услуг в планах закупок |
| `zfcs_purchasePlanOKPD2RefType` | IntegrationTypes.xsd | Классификация по ОКПД2 в планах закупок и в планах графиках с 01.01.2017 |
| `zfcs_purchasePlanOrganizationType` | IntegrationTypes.xsd | Данные организации для плана закупок |
| `zfcs_purchasePlanPeriodicityType` | IntegrationTypes.xsd | Тип: Периодичность осуществления закупки |
| `zfcs_purchasePlanPositionChangeReasonRef` | IntegrationTypes.xsd | Ссылка на справочник "Обоснования внесения изменений в позицию плана закупок" () |
| `zfcs_purchasePlanPositionDecisionType` | IntegrationTypes.xsd | Вынесенное решение для позиции плана закупок |
| `zfcs_purchasePlanPositionType` | IntegrationTypes.xsd | Общие сведения позиции плана закупок |
| `zfcs_purchasePlanPurchasesSubsecYearsInfoType` | IntegrationTypes.xsd | Тип: Сведения об объемах средств, указанных в правовых актах (проектах правовых актов), предусматривающих возможность заключения государственного (муниципального) контракта на срок, превышающий срок действия доведенных лимитов бюджетных обязательств |
| `zfcs_purchasePlanSpecialPurchaseRef` | IntegrationTypes.xsd | Ссылка на справочник "Типы особых закупок" в планах закупок и планах-графиках |
| `zfcs_purchasePlanSpecialPurchaseType` | IntegrationTypes.xsd | Общие сведения особой закупки плана закупок |
| `zfcs_purchasePlanType` | IntegrationTypes.xsd | План закупок в структурированной форме |
| `zfcs_purchaseProcedureBiddingType` | IntegrationTypes.xsd | Данные процедуры проведения закрытого аукциона |
| `zfcs_purchaseProcedureCollectingType` | IntegrationTypes.xsd | Данные процедуры сбора заявок |
| `zfcs_purchaseProcedureCollectingWithFormType` | IntegrationTypes.xsd | Данные процедуры сбора заявок с формой |
| `zfcs_purchaseProcedureContractingType` | IntegrationTypes.xsd | Данные процедуры контрактования |
| `zfcs_purchaseProcedureOKDType` | IntegrationTypes.xsd | Информация о процедуре закупки ОК-Д (двухэтапный конкурс) |
| `zfcs_purchaseProcedureOKOUType` | IntegrationTypes.xsd | Информация о процедуре закупки ОК-ОУ (конкурс с ограниченным участием) |
| `zfcs_purchaseProcedureOKType` | IntegrationTypes.xsd | Информация о процедуре закупки ОК (открытый конкурс) |
| `zfcs_purchaseProcedureOpeningType` | IntegrationTypes.xsd | Данные процедуры вскрытия конвертов, открытия доступа к электронным документам заявок участников |
| `zfcs_purchaseProcedurePrequalificationType` | IntegrationTypes.xsd | Данные процедуры предквалификационного отбора |
| `zfcs_purchaseProcedureScoringPlaceType` | IntegrationTypes.xsd | Данные процедуры Информация о процедуре рассмотрения и оценки заявок |
| `zfcs_purchaseProcedureScoringType` | IntegrationTypes.xsd | Данные процедуры Информация о процедуре рассмотрения и оценки заявок |
| `zfcs_purchaseProcedureSelectingType` | IntegrationTypes.xsd | Данные процедуры проведения предварительного отбора |
| `zfcs_purchaseProcedureZakAType` | IntegrationTypes.xsd | Информация о процедуре закупки ЗакА (закрытый аукцион) |
| `zfcs_purchaseProlongationCommonType` | IntegrationTypes.xsd | Общий тип для продлений сроков |
| `zfcs_purchaseProlongationOKType` | IntegrationTypes.xsd | Уведомление о продлении срока рассмотрения и оценки заявок |
| `zfcs_purchaseProlongationZKType` | IntegrationTypes.xsd | Извещение продлении срока подачи котировочных заявок |
| `zfcs_purchaseProtocolEFNoCommissionType` | IntegrationTypes.xsd | Общий тип для структурированных протоколов электронного аукциона (необязательное указание комиссии) |
| `zfcs_purchaseProtocolEFType` | IntegrationTypes.xsd | Общий тип для структурированных протоколов электронного аукциона |
| `zfcs_purchaseProtocolType` | IntegrationTypes.xsd | Общий тип для структурированных протоколов |
| `zfcs_quickRefOrganizationType` | IntegrationTypes.xsd | Основные данные организации для реестров РПЗ |
| `zfcs_refusalFact` | IntegrationTypes.xsd | Отказ от заключения контракта |
| `zfcs_refusalFactFoundation` | IntegrationTypes.xsd | Основание отказа от заключения контракта |
| `zfcs_regulationRulesInvalidType` | IntegrationTypes.xsd | Недействительность правил нормирования в сфере закупок |
| `zfcs_regulationRulesType` | IntegrationTypes.xsd | Версия правил нормирования в сфере закупок |
| `zfcs_regulatoryLegalActInfoType` | IntegrationTypes.xsd | Версия нормативно-методической и справочной информации по регулированию контрактной системы в сфере закупок |
| `zfcs_releasePurchaseDocumentationType` | IntegrationTypes.xsd | Информация о предоставлении конкурсной\аукционной документации |
| `zfcs_repAutoNotPassProtocolType` | IntegrationTypes.xsd | Протокол о непрохождении автоматической проверки соблюдения правил формирования и направления информации в РЕП |
| `zfcs_repAutoTestNoticeType` | IntegrationTypes.xsd | Уведомление о прохождении автоматической проверки соблюдения правил формирования и направления информации в РЕП |
| `zfcs_repCommonInfo` | IntegrationTypes.xsd | Общая информация в реестровой записи РЕП |
| `zfcs_repContractChangeInfo` | IntegrationTypes.xsd | Сведения об изменении условий контракта в реестровой записи РЕП |
| `zfcs_repContractInfo` | IntegrationTypes.xsd | Информация о контракте в реестровой записи РЕП |
| `zfcs_repContractTerminationInfo` | IntegrationTypes.xsd | Сведения о расторжении контракта в реестровой записи РЕП |
| `zfcs_repDates` | IntegrationTypes.xsd | Диапазон дат для реестровой записи РЕП |
| `zfcs_repModificationInfo` | IntegrationTypes.xsd | Сведения о внесении изменений в реестровой записи РЕП |
| `zfcs_repNPA` | IntegrationTypes.xsd | Информация о нормативно-правовом акте в реестровой записи РЕП |
| `zfcs_repOnlySupplierType` | IntegrationTypes.xsd | Информация о единственном поставщике из Реестра единственных поставщиков товара, производство которого создается модернизируется, осваивается, единственном исполнителе услуги, оказываемой с использованием имущества, которое создается, реконструируется (РЕП) |
| `zfcs_repPlacerOrgType` | IntegrationTypes.xsd | Организация, разместившая сведения в реестровой записи РЕП |
| `zfcs_repProductsType` | IntegrationTypes.xsd | Перечень товаров, производство которого создается или модернизируется и (или) осваивается на территории Российской Федерации в соответствии с контрактом |
| `zfcs_repProductType` | IntegrationTypes.xsd | Сведения о товаре, производство которого создается или модернизируется и (или) осваивается на территории Российской Федерации в соответствии с контрактом |
| `zfcs_repSimpleOrganizationInfo` | IntegrationTypes.xsd | Данные организации для Реестра единственных поставщиков |
| `zfcs_repSupplierInfo` | IntegrationTypes.xsd | Информация о поставщике в реестровой записи РЕП |
| `zfcs_requestForQuotationCancelType` | fcsPrintForm.xsd | Отмена запроса цен товаров, работ, услуг |
| `zfcs_requestForQuotationCancelType` | IntegrationTypes.xsd | Отмена запроса цен товаров, работ, услуг |
| `zfcs_requestForQuotationType` | fcsPrintForm.xsd | Версия запроса цен товаров, работ, услуг |
| `zfcs_requestForQuotationType` | IntegrationTypes.xsd | Версия запроса цен товаров, работ, услуг |
| `zfcs_requirementType` | IntegrationTypes.xsd | Тип: Требование к участникам |
| `zfcs_requirementWithAddReqsType` | IntegrationTypes.xsd | Тип: Требование к участникам (с дополнительными требованиями) |
| `zfcs_restrictionType` | IntegrationTypes.xsd | Тип: Ограничение для участников |
| `zfcs_rightSideKTRUCharacteristicType` | IntegrationTypes.xsd | Тип КТРУ: Характеристика позиции правой части КТРУ |
| `zfcs_rightSideKTRUPositionType` | IntegrationTypes.xsd | Позиция правой части (ПЧ) КТРУ |
| `zfcs_secondPartAppOpeningType` | IntegrationTypes.xsd | Тип: Сведения о факте вскрытия вторых частей заявок |
| `zfcs_signIncomingConfirmationType` | IntegrationTypes.xsd | Результат обработки для бесшовной интеграции с присвоенным реестровым номером и датой публикации документа |
| `zfcs_signIncomingReqConfirmationType` | IntegrationTypes.xsd | Запрос результата обработки с присвоенным реестровым номером и датой публикации документа |
| `zfcs_sketchPlanExecutionType` | IntegrationTypes.xsd | Сведения об исполнении плана закупок |
| `zfcs_sketchPlanType` | IntegrationTypes.xsd | План закупок в неструктурированной форме |
| `zfcs_sourceUnplannedCheckType` | IntegrationTypes.xsd | Тип: Источник для РВП по 44-ФЗ (согласно ПП РФ №1148) |
| `zfcs_specialPurchases2020Ref` | IntegrationTypes.xsd | Тип: Ссылка на справочник Типы особых закупок для планов-графиков с 01.01.2020 |
| `zfcs_stageType` | IntegrationTypes.xsd | Этап контракта |
| `zfcs_standardContractInvalidType` | IntegrationTypes.xsd | Сведения о недействительности типового контракта, типовых условий контракта |
| `zfcs_standardContractPurchaseObjectType` | IntegrationTypes.xsd | Тип: Описание объектов закупки, для которых применяются типовой контракт, типовые условия контракта |
| `zfcs_standardContractType` | IntegrationTypes.xsd | Типовой контракт, типовые условия контракта |
| `zfcs_subjectRFRef` | IntegrationTypes.xsd | Ссылка на справочник субъектов РФ |
| `zfcs_subStageType` | IntegrationTypes.xsd | Месяц, год финансирования контракта |
| `zfcs_summaryDocEAType` | IntegrationTypes.xsd | Тип: Сводные сведения о цепочке документов Электронного Актирования. Служебный документ, не используется при обмене с внешними системами |
| `zfcs_tendePlanInfoType` | IntegrationTypes.xsd | Информация о плане-графике |
| `zfcs_tenderPlan.ContextType` | IntegrationTypes.xsd | Суммы в разрезе КБК и КОСГУ в плане-графике |
| `zfcs_tenderPlan2017CommonInfoType` | IntegrationTypes.xsd | Общая информация о плане-графике с 01.01.2017 |
| `zfcs_tenderPlan2017ContractLifeCycleCaseRef` | IntegrationTypes.xsd | Тип: Ссылка на справочник: Случаи заключения контракта жизненного цикла |
| `zfcs_tenderPlan2017DrugNumberType` | IntegrationTypes.xsd | Количество (объем) закупаемых лекарственных препаратов в плане-графике |
| `zfcs_tenderPlan2017DrugPurchaseObjectsInfoType` | IntegrationTypes.xsd | Тип: Сведения об объектах закупки в том случае, когда объектами закупки являются лекарственные препараты (РПГ) |
| `zfcs_tenderPlan2017FinalPositionsPPRF73Type` | IntegrationTypes.xsd | Итоговые показатели плана-графика по ПП РФ 73 |
| `zfcs_tenderPlan2017FinalPositionsType` | IntegrationTypes.xsd | Итоговые показатели плана-графика с 01.01.2017 |
| `zfcs_tenderPlan2017FinanceResourcesType` | IntegrationTypes.xsd | Планируемые платежи в позиции плана-графика с 01.01.2017 |
| `zfcs_tenderPlan2017KBKsInfoType` | IntegrationTypes.xsd | Тип: Детализация по кодам бюджетной классификации |
| `zfcs_tenderPlan2017ManualKtruCharacteristicType` | IntegrationTypes.xsd | Тип: Характеристика товаров, работ, услуг для ввода в текстовой форме |
| `zfcs_tenderPlan2017MethodPriceFoundationType` | IntegrationTypes.xsd | Метод определения и обоснования НМЦК для позиции плана-графика с 01.01.2017 |
| `zfcs_tenderPlan2017NumberType` | IntegrationTypes.xsd | Количество (объем) закупаемых товаров, работ, услуг в позиции плана-графика с 01.01.2017 |
| `zfcs_tenderPlan2017PositionChangeReasonRef` | IntegrationTypes.xsd | Ссылка на справочник причин изменения позиции плана-графика с 01.01.2017 |
| `zfcs_tenderPlan2017PositionDecisionType` | IntegrationTypes.xsd | Вынесенное решение для позиции плана-графика закупок |
| `zfcs_tenderPlan2017PositionType` | IntegrationTypes.xsd | Позиция плана-графика с 01.01.2017 |
| `zfcs_tenderPlan2017PrefsReqsFoundationType` | IntegrationTypes.xsd | Обоснование дополнительного требования к участникам закупки в позиции плана-графика с 01.01.2017 |
| `zfcs_tenderPlan2017PrefsReqsType` | IntegrationTypes.xsd | Преимущества (требования, ограничения) к участникам закупки в позиции плана-графика с 01.01.2017 |
| `zfcs_tenderPlan2017ProductType` | IntegrationTypes.xsd | Тип: Товар, работа, услуга в спецификации ТРУ в позиции плана-графика |
| `zfcs_tenderplan2017PurchaseFailedConsequenceType` | IntegrationTypes.xsd | Тип: Последствия признания закупки несостоявшейся |
| `zfcs_tenderPlan2017PurchasePlanPositionRefType` | IntegrationTypes.xsd | Сведения позиции плана закупок в позиции плана-графика с 01.01.2017 |
| `zfcs_tenderPlan2017RefKtruCharacteristicType` | IntegrationTypes.xsd | Тип: Характеристика товаров, работ, услуг для ввода из справочника |
| `zfcs_tenderPlan2017SpecialPurchaseType` | IntegrationTypes.xsd | Особая позиция в плане-графике с 01.01.2017 |
| `zfcs_tenderPlan2017Type` | IntegrationTypes.xsd | План-график в структурированной форме с 01.01.2017 |
| `zfcs_tenderPlanCancelType` | IntegrationTypes.xsd | Аннулирование плана-графика |
| `zfcs_tenderPlanChange2017Type` | IntegrationTypes.xsd | Изменение плана-графика в структурированной форме с 01.01.2017 |
| `zfcs_tenderPlanChangeIDType` | IntegrationTypes.xsd | Идентификатор записи изменения плана-графика в МОД |
| `zfcs_tenderPlanChangeType` | IntegrationTypes.xsd | Изменение плана-графика |
| `zfcs_tenderPlanCommonInfoType` | IntegrationTypes.xsd | Общая информация о плане-графике |
| `zfcs_tenderPlanFinalPositionsType` | IntegrationTypes.xsd | Итоговые позиции плана-графика |
| `zfcs_tenderPlanIDType` | IntegrationTypes.xsd | Идентификатор записи плана-графика в МОД |
| `zfcs_tenderPlanPositionKBK2016sType` | IntegrationTypes.xsd | Суммы в разбивке по КБК 2016 |
| `zfcs_tenderPlanPositionKBKsType` | IntegrationTypes.xsd | Суммы в разбивке по КБК |
| `zfcs_tenderPlanPositionKOSGUsType` | IntegrationTypes.xsd | Суммы в разбивке по КОСГУ |
| `zfcs_tenderPlanPositionKVRsType` | IntegrationTypes.xsd | Суммы в разбивке по КВР |
| `zfcs_tenderPlanPositionType` | IntegrationTypes.xsd | Позиция плана-графика |
| `zfcs_tenderPlanTotalPositionKBK2016sType` | IntegrationTypes.xsd | Итоговые суммы в разбивке по КБК 2016 |
| `zfcs_tenderPlanTotalPositionKBKsType` | IntegrationTypes.xsd | Итоговые суммы в разбивке по КБК |
| `zfcs_tenderPlanTotalPositionKOSGUsType` | IntegrationTypes.xsd | Итоговые суммы в разбивке по КОСГУ |
| `zfcs_tenderPlanTotalPositionKVRsType` | IntegrationTypes.xsd | Итоговые суммы в разбивке по КВР |
| `zfcs_tenderPlanType` | IntegrationTypes.xsd | План-график в структурированной форме |
| `zfcs_tenderPlanUnstructuredType` | IntegrationTypes.xsd | План-график в неструктурированной форме |
| `zfcs_tenderSuspensionType` | IntegrationTypes.xsd | Информация о приостановке определения поставщика (подрядчика, исполнителя) в части заключения контракта |
| `zfcs_timeEFType` | IntegrationTypes.xsd | Время проведения электронного аукциона |
| `zfcs_timelineViolationType` | IntegrationTypes.xsd | Уведомление о нарушении контроля времени получения подтверждения |
| `zfcs_TOFKRef` | IntegrationTypes.xsd | Ссылка на справочник Территориальных органов ФК (ТОФК) |
| `zfcs_tradeInfoType` | IntegrationTypes.xsd | Тип: Торговое наименование (ТН) лекарственного препарата |
| `zfcs_unfairSupplierType` | IntegrationTypes.xsd | Сведения о недобросовестном поставщике. Устарело, не применяется с 01.04.2022 |
| `zfcs_unplannedCheckBaseType` | IntegrationTypes.xsd | Тип: Основание проведения проверки во внеплановой проверке |
| `zfcs_unplannedCheckCancelType` | IntegrationTypes.xsd | Информация об отмене проведения внеплановой проверки |
| `zfcs_unplannedCheckCheckedObjectType` | IntegrationTypes.xsd | Тип: Предмет проверки во внеплановой проверке |
| `zfcs_unplannedCheckCommonInfoPrintFormType` | IntegrationTypes.xsd | Тип: Общая информация по внеплановой проверке (для печатной формы) |
| `zfcs_unplannedCheckCommonInfoType` | IntegrationTypes.xsd | Тип: Общая информация внеплановой проверки |
| `zfcs_unplannedCheckObjectType` | IntegrationTypes.xsd | Тип: Сведения о предмете плановой проверки (заказ, закупка) |
| `zfcs_unplannedCheckSubjectPlanType` | IntegrationTypes.xsd | Тип: Субъект внеплановой проверки |
| `zfcs_unplannedCheckTenderSuspType` | IntegrationTypes.xsd | Информация о приостановке определения поставщика (подрядчика, исполнителя) в части заключения контракта по внеплановой проверке |
| `zfcs_unplannedCheckTransferType` | IntegrationTypes.xsd | Тип: Информация о передаче внеплановой проверки по подведомственности / ведомственной принадлежности |
| `zfcs_unplannedCheckType` | IntegrationTypes.xsd | Информация по внеплановой проверке |
| `zfcs_unplannedEventBaseType` | IntegrationTypes.xsd | Тип: Основание проведения проверки во внеплановом контрольном мероприятии |
| `zfcs_unplannedEventCancelProjectType` | IntegrationTypes.xsd | Проект информации об отмене проведения внепланового контрольного мероприятия |
| `zfcs_unplannedEventCancelType` | IntegrationTypes.xsd | Информация об отмене проведения внепланового контрольного мероприятия |
| `zfcs_unplannedEventEventLinkType` | IntegrationTypes.xsd | Информация по связанному контрольному мероприятию для ВКМ |
| `zfcs_unplannedEventProjectType` | IntegrationTypes.xsd | Проект информации по внеплановому контрольному мероприятию |
| `zfcs_unplannedEventSuspensionType` | IntegrationTypes.xsd | Информация о приостановке/возобновлении внепланового контрольного мероприятия |
| `zfcs_unplannedEventType` | IntegrationTypes.xsd | Информация по внеплановому контрольному мероприятию |
| `zfcs_userTenderPlanType` | IntegrationTypes.xsd | Исполнитель из плана-графика |
| `zfcs_valueRangeReferenceType` | IntegrationTypes.xsd | Тип: Диапазон значений для характеристик, которые имеют связь со справочными характеристиками |
| `zfcs_valueRangeType` | IntegrationTypes.xsd | Тип: Диапазон значений |
| `zfcs_violationType` | IntegrationTypes.xsd | Нарушение приема |
| `zkrCanceledType` | QueueVBS\IntegrationVBSTypes.xsd | Тип: Сведения об аннулированной заявке на кассовый расход (ЗКР) |
| `zkrCommonType` | QueueVBS\IntegrationVBSTypes.xsd | Тип: Сведения о заявке на кассовый расход (ЗКР). Общий тип |
| `zkrDeniedRegistrationType` | QueueVBS\IntegrationVBSTypes.xsd | Тип: Сведения об отказанной заявке на кассовый расход (ЗКР) |
| `zkrExecutedType` | QueueVBS\IntegrationVBSTypes.xsd | Тип: Сведения об исполненной заявке на кассовый расход (ЗКР) |
| `zkrProjectType` | QueueVBS\IntegrationVBSTypes.xsd | Тип: Проект сведений о заявке на кассовый расход (ЗКР) |
| `zkrRegistredType` | QueueVBS\IntegrationVBSTypes.xsd | Тип: Сведения о зарегистрированной заявке на кассовый расход (ЗКР) |
| `zkrSentForVerificationType` | QueueVBS\IntegrationVBSTypes.xsd | Тип: Сведения о направленной в ПУР/АСФК заявке на кассовый расход (ЗКР) |

## simpleType

| NAME | FILE | DESCRIPTION |
| --- | --- | --- |
| `abandonedReasonCode` | BaseTypes.xsd | Тип: Код основания признания торгов несостоявшимися |
| `abandonedReasonName` | BaseTypes.xsd | Тип: Наименование основания признания торгов несостоявшимися |
| `abandonedReasonObjectName` | BaseTypes.xsd | Тип: Наименование интеграционного объекта в справочнике оснований признания процедуры несостоявшейся |
| `acceptanceResultCodeType` | IntegrationEATypes.xsd | Тип: Код итога приемки: 0 - Возвращено для уточнения; 1 - Товары (работы, услуги) приняты без расхождений (претензий); 2 - Товары (работы, услуги) приняты с расхождениями (претензией); 3 - Товары (работы, услуги) не приняты |
| `accountOrgType` | BaseTypes.xsd | Вид организации счета: CU ‒ счет Заказчика; SUP ‒ счет Поставщика |
| `accountType` | BaseTypes.xsd | Тип: Расчетный счет |
| `accountTypeType` | BaseTypes.xsd | Тип счета (для счета заказчика/поставщика): 01 ‒ Лицевой счет в ФК; 02 ‒ Лицевой счет в ФО; 03 ‒ Расчетный счет в банке; 04 ‒ Счет эскроу; 05 ‒ Счет для перечисления денежных средств; 06 ‒ Счет для уплаты налогов. |
| `additionalAgreementNumberAddType` | BaseTypes.xsd | Тип: Реестровый номер процедуры доп.соглашения |
| `admissionResultsEnum` | BaseTypes.xsd | Тип: Результат оценки в текстовом представлении, возможные значения: WIN_OFFER – Победитель LIKE_WIN_OFFER – Предложение о цене контракта такое же, как у победителя SECOND_OFFER – Лучшее предложение о цене контракта после победителя PASS_OFFER – Все остальные заявки |
| `agreement223RegNumType` | BaseTypes.xsd | Тип: Номер реестровой записи договора 223 ФЗ |
| `agreement223RegNumType` | IntegrationKOTypes.xsd | Тип: Номер реестровой записи договора 223 ФЗ |
| `analyticalReportType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Перечисление аналитических отчетов подсистемы мониторинга (ПМ) |
| `anotherKTRUNotUsingReasonType` | BaseTypes.xsd | Тип: Иная причина выбора единицы измерения, отличающейся от указанной в КТРУ |
| `appealActionCodeType` | BaseTypes.xsd | Тип: Код обжалуемого действия: DOCS - жалоба на положения извещения об осуществлении закупки, документации о закупке; ACCR - жалоба на действия (бездействие) оператора электронной площадки, совершенные при аккредитации участника закупки на электронной площадке; COMP - жалоба на действия (бездействие) субъекта (субъектов) контроля, совершенные после даты и времени окончания срока подачи заявок; DEA... |
| `appleadCanPostType` | BaseTypes.xsd | Тип: Возможность размещения с такими обжалуемыми действиями: 1 - дает возможность создавать жалобу с такими обжалуемыми действиями, 0 - нельзя создавать жалобу с таким обжалуемыми действиями, можно только просматривать уже размещенные |
| `approvalMismatchRegNumType` | BaseTypes.xsd | Тип: Реестровый номер уведомления о выявленных в обращении несоответствиях |
| `approvalRegNumType` | BaseTypes.xsd | Тип: Реестровый номер обращения в контрольный орган |
| `approvalTypeType` | IntegrationKOTypes.xsd | Тип: Тип обращения. singleParContract - обращение о согласовании заключения контракта с единственным поставщиком (подрядчиком, исполнителем); unfairSupplier2022 - обращение о включении в РНП |
| `article15PartsType` | BaseTypes.xsd | Тип: Особенности осуществления закупки в соответствии с ч. 4-6 ст. 15 Закона № 44-ФЗ: P4 - В соответствии с ч. 4 ст. 15 Закона № 44-ФЗ; P5 - В соответствии с ч. 5 ст. 15 Закона № 44-ФЗ; P6 - В соответствии с ч. 6 ст. 15 Закона № 44-ФЗ: P41 - В соответствии с ч. 4.1 ст. 15 Закона № 44-ФЗ; P43 - В соответствии с ч. 4.3 ст. 15 Закона № 44-ФЗ; P44 - В соответствии с ч. 4.4 ст. 15 Закона № 44-ФЗ. |
| `attachedDocumentKindCodeType` | BaseTypes.xsd | Тип: Код типа документа |
| `authorityType` | BaseTypes.xsd | Тип: Вид органа, возможные значения: FA - Федеральная антимонопольная служба; FO - Федеральная служба по оборонному заказу; S - Орган исполнительной власти субъекта РФ; M - Орган местного самоуправления муниципального района, городского округа. |
| `availAbsEvalEnum` | BaseTypes.xsd | Тип: Оценка наличия или отсутствия характеристики объекта закупки AVAIL_CHARS – Предусмотрено наличие характеристики; NO_CHARS – Предусмотрено отсутствие характеристики; NOT_PROV_CHARS – Не предусмотрено наличие или отсутствие характеристики |
| `bankGuaranteeDocNumberType` | BaseTypes.xsd | Тип: Номер документа независимой гарантии |
| `bankGuaranteeRegNumberType` | BaseTypes.xsd | Тип: Номер реестровой записи независимой гарантии |
| `baseDocumentType` | BaseTypes.xsd | Тип: Тип документа-основания (ЦРК): C - Контракт (оплата аванса); A - Документ о приемке; N – Сведения о начислении неустойки; U – Сведения об удержании неустойки |
| `bikType` | BaseTypes.xsd | Тип: БИК |
| `BONumber` | BaseTypes.xsd | Тип: Номер БО, присваиваемый в ПУР |
| `boNumberType` | BaseTypes.xsd | Тип: Номер бюджетного обязательства |
| `budgetCodeType` | BaseTypes.xsd | Тип: Код бюджета |
| `budgetLevelElectronicContractType` | BaseTypes.xsd | Тип: Уровень бюджета для электронных контрактов: 10 - федеральный бюджет; 20 - бюджет субъекта Российской Федерации; 30 - местный бюджет; 41 - бюджет Пенсионного фонда Российской Федерации; 42 - бюджет Фонда социального страхования Российской Федерации; 43 - бюджет Федерального фонда обязательного медицинского страхования; 50 - бюджет территориального государственного внебюджетного фонда. |
| `changePriceFoundationNumType` | BaseTypes.xsd | Тип: Код обоснования изменения цены контратка |
| `checkResultNumberType` | BaseTypes.xsd | Тип: Реестровый номер результата контроля, сформированный контрольным органом |
| `combinationEnumType` | BaseTypes.xsd | Тип: Признак комбинации 1-препараты составляют комбинацию (многокомпонентный препарат); 0-препарат не входит в состав комбинации (однокомпонентный препарат) |
| `commissionRoleCodeType` | BaseTypes.xsd | Тип: Код роли члена комиссии |
| `commonSubsystemType` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Тип: Перечисление подсистем ЕИС (44-ФЗ и 223-ФЗ), документы которых разрешено отдавать из ХД сервисами отдачи) |
| `commonSubsystemType` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Тип: Перечисление подсистем ЕИС (44-ФЗ и 223-ФЗ), документы которых разрешено отдавать из ХД сервисами отдачи |
| `confirmationResultType` | BaseTypes.xsd | Тип: Результат приема пакета |
| `consRegistryNumType` | BaseTypes.xsd | Тип: Код по Сводному реестру |
| `consRegistryNumType` | eis-fs-ws-api.xsd | Тип: Код по Сводному реестру |
| `constructionDocumentsFileType` | BaseTypes.xsd | Тип файла проектных документов по специализации строительства: 1-Локальный сметный расчет; 2-Объектная смета; 3-Сводный сметный расчет; 4-Ведомость объемов конструктивных решений; 5-Заключение экспертизы; 6-Иной документ Главгосэкспертизы; 7-Иной документ внешней специализированной программы; |
| `contractCRKType` | BaseTypes.xsd | Тип: Текущее состояние контракта: P – «Исполнение»; T – «Исполнение завершено»; R – «Исполнение прекращено»; A – «Аннулировано» |
| `contractDocNumType` | BaseTypes.xsd | Тип: Номер государственного или муниципального контракта |
| `contractDocRegNum615Type` | BaseTypes.xsd | Тип: Номер документа по договору о проведении капитального ремонта по ПП РФ № 615 |
| `contractGuaranteeConfirmationsEnum` | BaseTypes.xsd | Тип: Подтверждение предоставления обеспечения исполнения контракта и информации, подтверждающей добросовестность участника: GN - подтверждение предоставления обеспечения исполнения контракта в размере, указанном в извещении; GA - подтверждение предоставления обеспечения исполнения контракта не менее, чем в размере аванса; G1.5N - подтверждение предоставления обеспечения исполнения контракта в разм... |
| `contractKSNumType` | BaseTypes.xsd | Тип: Идентификатор государственного контракта |
| `contractLifeCycleCaseCodeType` | BaseTypes.xsd | Тип: Код случая заключения контракта жизненого цикла |
| `contractNumber615Type` | BaseTypes.xsd | Тип: Номер договора о проведении капитального ремонта по ПП РФ № 615 |
| `contractPartyTypeEnum` | BaseTypes.xsd | Тип: Сторона в договоре: C - Заказчик; S - Поставщик |
| `contractPenaltyTypeEnum` | BaseTypes.xsd | Тип: Тип штрафа/пени в исполнении договора: F - Штраф; I - Пени |
| `contractPeriodEnum` | BaseTypes.xsd | Тип:Перод, в течении которого заключен контракт до даты подачи заявки: 1 - Контракты, заключённые в течении 1 года до даты подачи заявки; 2 - Контракты, заключённые в течении 2-х лет до даты подачи заявки; 3 - Контракты, заключённые в течении 3-х лет до даты подачи заявки. |
| `contractProjDocNumType` | BaseTypes.xsd | Тип: Номер документов участвующих в процедуре подписания проекта контракта |
| `contractProjNumType` | BaseTypes.xsd | Тип: Номер проекта контракта |
| `contractRefusalReasonCodeType` | BaseTypes.xsd | Тип: Код основания для отказа от заключения контракта |
| `contractRegNum615Type` | BaseTypes.xsd | Тип: Номер номера реестровой записи реестра договоров о проведении капитального ремонта по ПП РФ № 615 |
| `contractRegNumExecutionType` | BaseTypes.xsd | Тип: Реестровый номер исполнения (расторжения) контракта (25 знака) |
| `contractRegNumType` | BaseTypes.xsd | Тип: Номер реестровой записи государственного или муниципального контракта |
| `contractTerminationReasonCodeType` | BaseTypes.xsd | Тип: Код основания расторжения контракта |
| `contractTerminationReasonDocCodeType` | BaseTypes.xsd | Тип: Код документа, являющегося основанием расторжения контракта |
| `contractTerminationReasonDocNameType` | BaseTypes.xsd | Тип: Наименование документа, являющегося основанием расторжения контракта |
| `contractTerminationReasonNameType` | BaseTypes.xsd | Тип: Наименование основания расторжения контракта |
| `control99ControlDocNumberType` | BaseTypes.xsd | Тип: Номер документа, содержащего информацию для осуществления контроля |
| `control99DocNumberType` | BaseTypes.xsd | Тип: Номер документа для контроля по 99 статье |
| `control99DocumentTypeEnum` | BaseTypes.xsd | Тип: Документы для контроля по 99 статье: contract - Сведения о контракте; contractProcedure - Сведения об исполнении (расторжении) контракта; purchasePlan - План закупок; tenderPlan2017 - План график с 01.01.2017; notification - Извещение (конкурсная документация); protocol - Итоговый протокол определения поставщика, подрядчика, исполнителя; contractProject - Проект контракта без подписей; contra... |
| `control99HeadNameType` | BaseTypes.xsd | Тип: ФИО руководителя согласно СвР |
| `controlRegistersRegNumberType` | BaseTypes.xsd | Тип: Номер реестровой записи контрольного реестра |
| `controlResultType` | IntegrationKOTypes.xsd | Тип: Тип результата контроля |
| `corrAccountNumberType` | BaseTypes.xsd | Тип: Номер корреспондентского счета |
| `costCriterionCodeEnum` | BaseTypes.xsd | Тип: Ценовые критерии оценки заявок участников: CP - Цена контракта, сумма цен единиц товара, работы, услуги; MC - Расходы на эксплуатацию и ремонт товаров, использование результатов работ; TC - Стоимость жизненного цикла товара или созданного в результате выполнения работы объекта; EN - Предложение о сумме соответствующих расходов заказчика, которые заказчик осуществит или понесет по энергосервис... |
| `costCriterionProtocolEOK2020FirstSectionsCodeEnum` | BaseTypes.xsd | Тип: Стоимостные критерии оценки заявок участников в протоколе рассмотрения и оценки первых частей заявок на участие в ЭOK20 (открытый конкурс в электронной форме с 01.10.2020 года): MC - Расходы на эксплуатацию и ремонт товаров, использование результатов работ. |
| `count18Type` | BaseTypes.xsd | Тип: Целочисленное поле 18 символов |
| `count20Type` | BaseTypes.xsd | Тип: Целочисленное поле 20 символов |
| `count256Type` | BaseTypes.xsd | Тип: Целочисленное поле 256 символов |
| `count4Type` | BaseTypes.xsd | Тип: Целочисленное поле 4 символа |
| `count5Type` | BaseTypes.xsd | Тип: Целочисленное поле 5 символов |
| `countryCodeType` | BaseTypes.xsd | Тип: Цифровой код страны |
| `cpContractProjDocNumType` | BaseTypes.xsd | Тип: Номер документов участвующих в процедуре подписания проекта контракта (25 или 28 знаков) |
| `cpContractProjNumKPmType` | BaseTypes.xsd | Тип: Номер проекта контракта (23 знака) |
| `cpContractProjNumType` | BaseTypes.xsd | Тип: Номер проекта контракта (23 или 26 знаков) |
| `currencyCodeType` | BaseTypes.xsd | Тип: Код ОКВ |
| `dayType` | BaseTypes.xsd | Тип: Тип дня:working - рабочий, calendar - календарный |
| `decimalKTRUCharacteristicValue18p11Type` | BaseTypes.xsd | Тип: Decimal значений характеристик КТРУ с 18 знаками до запятой и 11 знаками после запятой с возможностью указания отрицательного значения |
| `decimalKTRUCharacteristicValuePatternType` | BaseTypes.xsd | Тип: Decimal значений характеристик КТРУ с фиксированной точкой |
| `decimalKTRUCharacteristicValueType` | BaseTypes.xsd | Тип: Decimal значений характеристик КТРУ |
| `decisionActNumberType` | BaseTypes.xsd | Тип: Номер решения/акта, выданного КО |
| `decisionNumType` | BaseTypes.xsd | Тип: Номер решения заказчика об одностороннем отказе от исполнения контракта |
| `defenseContractIdType` | BaseTypes.xsd | Тип: Идентификатор государственного контракта по государственному оборонному заказу |
| `deviationFactFoundationCodeType` | BaseTypes.xsd | Тип: Код причины признания участника уклонившимся от заключения контракта |
| `disagreementCodeType` | BaseTypes.xsd | Тип: Код разногласия: DI - Наличие разногласий в отношении информации, включенной в проект контракта в соответствии с п. 1 ч. 2 ст. 51 Закона № 44-ФЗ ; RCC - Несогласие заключить контракт, содержащий условия, предусмотренные п. 2 ч. 2 ст. 51 Закона № 44-ФЗ; RCP - Направление предложения о снижении (без изменения иных условий, включенных в проект контракта) цены контракта, цены единицы товара, рабо... |
| `docNameType` | BaseTypes.xsd | Тип: Наименование документа для проектов контрактов |
| `docNumberType` | BaseTypes.xsd | Тип: Номер документа |
| `docNumPOAType` | BaseTypes.xsd | Тип: Уникальный номер документа доверенности в ЕИС |
| `documentBOStatusType` | docs-https-api.xsd | Тип: Статус документа БО: S - Направлены для постановки на учет, A - Ожидается постановка БО на учет, R - Поставлены на учет, D - Не поставлены на учет |
| `documentKindKOType` | docs-ws-api.xsd | Тип: Вид документа РКО Допустимые значения: checkPlan - План проверок для ИС КО; checkResult - Результат контроля для ИС КО; checkResultCancel - Информация об отмене результата контроля для ИС КО; complaint - Информация по жалобе для ИС КО; complaintCancel - Информация об отзыве жалобы для ИС КО; complaintGroup - Информация по групповой жалобе для ИС КО; electronicComplaint - Информация по жалобе,... |
| `documentKindRKType` | docs-ws-api.xsd | Тип: Вид документа РК |
| `documentKindROKOType` | docs-ws-api.xsd | Тип: Вид документа РОКО Допустимые значения: approval - Обращение в контрольный орган; approvalTransfer - Информация о передаче обращения в другой контрольный орган; approvalMismatch - Уведомление о выявленных в обращении несоответствиях |
| `documentKindRPGType` | docs-ws-api.xsd | Тип: Вид документа РПГ |
| `documentKindType` | BaseTypes.xsd | Тип: Вид документа: bankGuarantee - Информация о выданной независимой гарантии; внесение изменений; bankGuaranteeInvalid - Информация о недействительности сведений о независимой гарантии; bankGuaranteeRefusal - Сведения об отказе заказчика в принятии независимой гарантии; внесение изменений; bankGuaranteeRefusalInvalid - Сведения о недействительности отказа заказчика в принятии независимой гаранти... |
| `documentNumber615Type` | BaseTypes.xsd | Тип: Номер документа по ПП РФ № 615 |
| `documentNumberRegistryType` | BaseTypes.xsd | Тип: Номер документа реестра квалифицированных подрядных организаций по ПП РФ № 615 |
| `documentNumberType` | BaseTypes.xsd | Тип: Номер документа для проектов контрактов |
| `documentRBGStatusType` | docs-https-api.xsd | Тип: Статус документа РНГ: P - опубликован; I - недействителен; A - аннулирован |
| `documentStatusType` | docs-ws-api.xsd | Тип: Статус документа |
| `documentType` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Тип: Тип документа |
| `documentType` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Тип: Тип документа |
| `documentType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Тип документа |
| `documentType70ArticleType` | BaseTypes.xsd | Тип документа, принимаемый в ContractSign по ст. 70: CPWOS - Проект контракта без подписей, направляемый победителю аукциона; PDWWS - Протокол разногласий с подписью победителя аукциона; RRWCS - Документ с причинами отказа учета замечаний в протоколе разногласий с подписью заказчика и (или) Проект контракта, направляемый победителю аукциона CPWWS - Проект контракта с подписью победителя аукциона E... |
| `drugDecimalCodeType` | BaseTypes.xsd | Тип: Decimal для справочника "Лекарственные препараты" |
| `drugExternalCodeType` | BaseTypes.xsd | Тип: Уникальный код в справочнике для справочника "Лекарственные препараты" |
| `drugName2000Type` | BaseTypes.xsd | Тип: Наименование 2000 для справочника "Лекарственные препараты" |
| `drugNameType` | BaseTypes.xsd | Тип: Наименование для справочника "Лекарственные препараты" |
| `drugPackaging1QuantityType` | BaseTypes.xsd | Тип: Количество лекарственных форм в первичной упаковке в справочнике "Лекарственные препараты" |
| `drugPackaging2QuantityType` | BaseTypes.xsd | Тип: Количество первичных упаковок во вторичной (потребительской) упаковке в справочнике "Лекарственные препараты" |
| `drugQuantityType` | BaseTypes.xsd | Тип: Количество для лекарственных препаратов в плане-графике |
| `drugSumaryPackagingQuantityType` | BaseTypes.xsd | Тип: Количество лекарственных форм во вторичной (потребительской) упаковке в справочнике "Лекарственные препараты" |
| `drugTotalQuantityType` | BaseTypes.xsd | Тип: Общее количество |
| `EATaxesCodeType` | BaseTypes.xsd | Тип: Код вида документа налога или взноса физического лица |
| `EKKTCodeType` | BaseTypes.xsd | Тип: Код ЕККТ |
| `electronicContractDocTypeType` | BaseTypes.xsd | Тип документа ПЗК для электронного контракта и информация о заключенном электронном контракте в целевом реестре контрактов (ЦРК). Допустимые значения: 1 – ПЭК по конкурентной процедуре; 2 - ПЭК с ед. поставщиком; 3 - ПЭК с ед. поставщиком в результате несостоявшейся закупки по конкурентной процедуре; 4 - ПЭК по доп. соглашению; EPM - ПЭК по закупке малого объема (без котировочной сессии); KPM - ПЭ... |
| `electronicContractPriceType` | BaseTypes.xsd | Тип: Способ указания цены в электронном контракте: P - цена контракта; MP - максимальное значение цены контракта; OP - ориентировочное значение цены контракта |
| `electronicСontractCRKRegNumType` | BaseTypes.xsd | Тип: Номер реестровой записи ЦРК |
| `eMailType` | BaseTypes.xsd | Тип: Адрес электронной почты |
| `emCodeType` | BaseTypes.xsd | Тип: Кодовое наименование электронного магазина |
| `EMZDocumentsTypeEnum` | BaseTypes.xsd | Тип: Типы документов ЭЗМ |
| `equipmentType` | BaseTypes.xsd | Тип: Тип (оборудование/ПО) |
| `errCodeType` | eis-fs-ws-api.xsd | Тип: Код ошибки: UNKNOWN - неизвестная ошибка; SYSTEM - системная ошибка; UNKNOWN_SENDER - неизвестный отпраивтель; UNKNOWN_OWNER - неизвестная организация-владелец; FILE_ID_INCORRECT - неверный идентификатор файла; CONTENT_INCOMPLETE - получен не весь контент файла; DIGEST_INCORRECT - полученная хеш-суммма контента файла не совпадает с вычисленной; RANGE_INCORRECT - неверно указан диапазон; CHUNK... |
| `errorCodeType` | BaseTypes.xsd | Тип: Код ошибки |
| `eruzRegistryNumType` | BaseTypes.xsd | Тип: Номер реестровой записи в ЕРУЗ |
| `ERUZTaxPayerCode` | BaseTypes.xsd | Тип:Тип: Код налогоплательщика в стране регистрации или его аналог для участника из ЕРУЗ |
| `etpCodeType` | BaseTypes.xsd | Тип: Кодовое наименование электронной площадки |
| `evasDevFactFoundationCodeType` | BaseTypes.xsd | Тип: Код основания для ПОК и ППУ с 01.01.2020 |
| `evasDevFactFoundationNameType` | BaseTypes.xsd | Тип: Наименование основания для ПОК и ППУ с 01.01.2020 |
| `exclusionReason615CodeType` | BaseTypes.xsd | Тип: Код вида услуги или работы в соотвествии со ст. 166 Жилищного кодекса РФ |
| `externalIdType` | BaseTypes.xsd | Тип: Внешний идентификатор |
| `extPartnerType` | docs-https-api.xsd | Тип: Тип внешнего контрагента документа: VSRZ - Внешняя система размещения заказов; RMIS - Региональная муниципальная информационная система; FAS - Федеральная антимонопольная служба; ETP - Электронная торговая площадка; BANK - Банк; GIIS_EB - ГИИС Электронный бюджет, OA - Информационные системы органов аудита, OVK - Информационные системы органов внутреннего контроля, IKO - Информационные системы... |
| `extPartnerType` | docs-ws-api.xsd | Тип: Тип внешнего контрагента документа: VSRZ - Внешняя система размещения заказов; RMIS - Региональная муниципальная информационная система; FAS - Федеральная антимонопольная служба; ETP - Электронная торговая площадка; BANK - Банк; GIIS_EB - ГИИС Электронный бюджет, OA - Информационные системы органов аудита, OVK - Информационные системы органов внутреннего контроля, IKO - Информационные системы... |
| `fileHashType` | BaseTypes.xsd | Тип: Hash файла |
| `fileNameType` | BaseTypes.xsd | Тип: Имя файла |
| `fileNameType` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Тип: Наименование файла при отдаче |
| `fileNameType` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Тип: Наименование файла при отдаче |
| `fileNameType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Наименование файла при отдаче |
| `fileNameType` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Тип: Наименование файла при отдаче |
| `fileNameType` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Тип: Наименование файла при отдаче |
| `fileSizeType` | BaseTypes.xsd | Тип: Размер файла |
| `foundationDocumentKindType` | docs-https-api.xsd | Тип: Вид документа-основания: CO - контракт, NO – извещение об осуществлении закупки. |
| `fromHourType` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Тип: Час начала поиска документов |
| `fromHourType` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Тип: Час начала поиска документов |
| `fromHourType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Час начала поиска документов |
| `fromHourType` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Тип: Час начала поиска документов |
| `fromHourType` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Тип: Час начала поиска документов |
| `fundingSources615CodeType` | BaseTypes.xsd | Тип: Код типа источника финансирования по ПП РФ № 615 |
| `GRBSCodeType` | BaseTypes.xsd | Тип: Код ГРБС |
| `groupBuildCodeType` | BaseTypes.xsd | Тип: Код группы работ по строительству |
| `GTINType` | BaseTypes.xsd | Тип: Код товара (GTIN) |
| `guidType` | BaseTypes.xsd | Тип: Глобальный идентификатор |
| `guidType` | eis-fs-ws-api.xsd | Тип: Глобальный идентификатор |
| `guidType` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Тип: Глобальный идентификатор |
| `guidType` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Тип: Глобальный идентификатор |
| `guidType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Глобальный идентификатор |
| `guidType` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Тип: Глобальный идентификатор |
| `guidType` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Тип: Глобальный идентификатор |
| `hash32` | BaseTypes.xsd | Тип: Контрольная сумма версии (32) |
| `hexHashSha256Type` | BaseTypes.xsd | Тип: HEX представление хеша, рассчитанного по алгоритму SHA256 |
| `holdingDocType` | BaseTypes.xsd | Тип документа для удержания неустойки: A - Аванс; B – Документ о приемке: N - Требование о неустойке |
| `hourType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Час в течение суток |
| `hourType` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Тип: Час в течение суток |
| `hourType` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Тип: Час в течение суток |
| `hrefType` | BaseTypes.xsd | Тип: Гиперссылка |
| `iko223Type` | BaseTypes.xsd | ИКО (идентификационный код) для 223ФЗ |
| `ikuType` | BaseTypes.xsd | Тип: ИКУ |
| `ikzCodeType` | BaseTypes.xsd | Тип: Индивидуальный код закупки (ИКЗ) |
| `indexModeType` | BaseTypes.xsd | Тип: Перечисление режимов: PROD - промышленная эксплуатация; TEST - тестовые данные/ |
| `indexModeType` | eis-fs-ws-api.xsd | Тип: Перечисление режимов: PROD - промышленная эксплуатация; TEST - тестовые данные/ |
| `indexModeType` | eisSignIncoming.xsd | Тип: Перечисление режимов: PROD - промышленная эксплуатация; TEST - тестовые данные/ |
| `indexModeType` | fcsIntegration.xsd | Перечисление режимов |
| `indexObjectTypeEnum` | eisSignIncoming.xsd | Тип: Перечисление типов объектов: TP - План график; PP - План закупок (структурированный); EF - Электронный аукцион; EP - Единственный поставщик; OK - Открытый конкурс; OKD - Открытый конкурс, двухэтапный; OKOU - Открытый конкурс с ограниченным участием; PO - Предварительный отбор; ZAKA - Закрытый аукцион; ZAKK - Закрытый конкурс; ZAKKD - Закрытый конкурс, двухэтапный; ZAKKOU - Закрытый конкурс с ... |
| `indicationSubjectsType` | BaseTypes.xsd | Тип: Способ указания объема выполнения работы, оказания услуги: Q - Объем может быть указан в количественном выражении; NQ - Объем не может быть указан в количественном выражении (указание объема в текстовом виде) |
| `indicatorValueType` | BaseTypes.xsd | Тип: Значение показателя критерия оценки заявок участников |
| `industrySpecializationType` | BaseTypes.xsd | Тип: Отраслевая специализация: CONSTRUCTION_WORKS - Строительство; DRUGS_PURCHASE - Лекарственные препараты; RESIDENTIAL_PREMISES_PURCHASE - Приобретение жилых помещений |
| `innEntityType` | BaseTypes.xsd | Тип: ИНН юридического лица |
| `innIndividualType` | BaseTypes.xsd | Тип: ИНН физического лица |
| `innOrganizationType` | BaseTypes.xsd | Тип: ИНН организации |
| `innPaymentType` | BaseTypes.xsd | Тип: ИНН для платежных документов |
| `innType` | BaseTypes.xsd | Тип: ИНН |
| `innType` | docs-ws-api.xsd | Тип: ИНН (или аналог ИНН для иностранного поставщика) |
| `journalNumberType` | BaseTypes.xsd | Тип: Номер заявки |
| `kbkType` | BaseTypes.xsd | Тип: КБК |
| `kbkZeroType` | BaseTypes.xsd | Тип: КБК с возможность указания строго 20 цифр или значения 0 |
| `kladrCodeType` | BaseTypes.xsd | Тип: Код КЛАДР |
| `kladrTextType` | BaseTypes.xsd | Тип: Текстовое обозначение в КЛАДР |
| `KOKSAttachmentType` | BaseTypes.xsd | Тип: Тип вложенности |
| `KOKSCodeType` | BaseTypes.xsd | Тип: Код объекта капитального строительства |
| `KOKSFPCodeType` | BaseTypes.xsd | Код формы собственности КОКС : 1 - федеральная собственность; 2 - собственность субъекта Российской Федерации; 3 - муниципальная собственность; 4 - частная собственность. |
| `KOKSPartType` | BaseTypes.xsd | Тип: Часть КОКС |
| `KOKSSecretLevelType` | BaseTypes.xsd | Уровень секретности документа-основания КОКС: L0 – несекретно; L1 – ДСП; L2 – секретно; L3 – совершенно секретно. |
| `kppType` | BaseTypes.xsd | Тип: КПП |
| `kppType` | docs-ws-api.xsd | Тип: КПП поставщика |
| `ktruCharacteristicKindType` | BaseTypes.xsd | Тип КТРУ: Вид характеристики позиции КТРУ: 1 - неизменяемая заказчиком, 2 - изменемая заказчиком с выбором одного значения, 3 - изменяемая заказчиком, выбор нескольких значений |
| `ktruCharacteristicTypeType` | BaseTypes.xsd | Тип КТРУ: Тип характеристики позиции КТРУ:1 - качественная, 2 - количественная |
| `ktruCharacteristicValueFormatType` | BaseTypes.xsd | Тип КТРУ: Формат значения характеристики: N - числовой; A - дополнительный |
| `ktruClassifierCodeType` | BaseTypes.xsd | Тип КТРУ: Код в классификаторе |
| `ktruClassifiersCodeType` | BaseTypes.xsd | Тип КТРУ: Код классификатора |
| `ktruCodeType` | BaseTypes.xsd | Тип КТРУ: Код позиции |
| `ktruDictCodeType` | BaseTypes.xsd | Тип КТРУ: Код в справочнике |
| `ktruDictNameType` | BaseTypes.xsd | Тип КТРУ: Наименование в справочнике |
| `ktruMaxMathNotationType` | BaseTypes.xsd | Тип КТРУ: Математическое обозначение отношения к максимальному значению диапазона |
| `ktruMinMathNotationType` | BaseTypes.xsd | Тип КТРУ: Математическое обозначение отношения к минимальному значению диапазона |
| `KTRUNotUsingReasonCodeType` | BaseTypes.xsd | Тип КТРУ: Код причины неприменения ЕИ, указанной в КТРУ |
| `ktruSourceType` | BaseTypes.xsd | Тип КТРУ: Источник классификатора: M (manual) – справочник сформирован пользователем; E (external) – справочник загружен из внешней системы; N_OKPD2 - справочник НСИ ОКПД2; N_OKVED2 – справочник НСИ ОКВЭД2 |
| `ktruVersionCodeType` | BaseTypes.xsd | Тип КТРУ: Код версии позиции |
| `KVRCodeType` | BaseTypes.xsd | Тип: Код вида расходов (справочник КВР) |
| `len0or10Type` | BaseTypes.xsd | Тип: Текстовое поле 0 или 10 символов |
| `len0or12Type` | BaseTypes.xsd | Тип: Текстовое поле 0 или 12 символов |
| `len0or13or15Type` | BaseTypes.xsd | Тип: Текстовое поле 0 или 13 или 15 символов |
| `len0or15Type` | BaseTypes.xsd | Тип: Текстовое поле 0 или 15 символов |
| `len0or36Type` | BaseTypes.xsd | Тип: Текстовое поле 0 или 36 символов |
| `len0or9Type` | BaseTypes.xsd | Тип: Текстовое поле 0 или 9 символов |
| `len27or30Type` | BaseTypes.xsd | Тип: Текстовое поле 27 или 30 символов |
| `len27Type` | BaseTypes.xsd | Тип: Текстовое поле 27 символов |
| `len29or32Type` | BaseTypes.xsd | Тип: Текстовое поле 29 или 32 символов |
| `len29Type` | BaseTypes.xsd | Тип: Текстовое поле 29 символов |
| `linkedDocumentType` | QueueVBS\IntegrationVBSTypes.xsd | Тип: Тип связанного документа: CONTRACT - Первичное СГК; MOD_CONTRACT - Изменение СГК с типом «Изменение контракта»; COR_CONTRACT - Изменение СГК с типом «Исправление сведений»; COMPL_SVIK - Контракт исполнен; CLOSE_SVIK - Контракт прекращен; MOD_SBO - Изменение БО без изменения связанного документа; NOTICE - Извещение/приглашение; MOD_NOTICE - Извещение об изменении закупки; CAN_NOTICE - Закупка ... |
| `locCatalogCodeType` | BaseTypes.xsd | Тип: Код локального каталога |
| `longTextType` | eis-fs-ws-api.xsd | Тип: Длинное текстовое поле |
| `manualCharacteristicNameType` | BaseTypes.xsd | Тип: Наименование и значение характеристики в текстовой форме |
| `manualIndexValueType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Значение поискового индекса, заданное внешней системой |
| `measurementOrderEnum` | BaseTypes.xsd | Тип: Порядок оценки по показателю: F - лучшим условием исполнения контракта по критерию оценки (показателю) является наибольшее значение,L - лучшим условием исполнения контракта по критерию оценки (показателю) является наименьшее значение, O - оценка производится по шкале оценки или другому порядку, указанному в документации. |
| `messageStatusEnum` | BaseTypes.xsd | Тип: Статус обработки сообщения: processing - В процессе обработки, промежуточный статус; error - Ошибка обработки, окончательный статус; completed - Обработка завершена, окончательный статус подтверждений; wait_confirmation - Ожидает получения подтверждения приема, промежуточный статус бизнес-сообщения; confirmation_processing - Получено промежуточное подтверждение приема, промежуточный статус би... |
| `messageTypeEnum` | QueueVBS\queue-vbs-ws-api.xsd | Тип: Перечисление типов сообщений: boProject - Проект сведений о бюджетном обязательстве (БО); boSentForVerification - Сведения о бюджетном обязательстве (БО), направленные на проверку в ТОФК; boRegistred - Сведения о бюджетном обязательстве (БО), поставленные на учет; boDeniedRegistration - Сведения о бюджетном обязательстве (БО), отказанные в постановке на учет; boNotificationPublish - Сведения ... |
| `minRusProductCodeType` | BaseTypes.xsd | Тип: Порядковый номер для справочника Размеры минимальных обязательных долей закупок российских товаров |
| `minRusRejectReasonCodeType` | BaseTypes.xsd | Тип: Код причины невозможности достижения минимальной обязательной доли закупок |
| `moneyLongType` | BaseTypes.xsd | Тип: Сумма c 11 знаками в дробной части |
| `moneyMaxLengthFrom0To18Type` | BaseTypes.xsd | Тип: Неотрицательная сумма c максимальной длиной до точки 18 символов (необязательная) |
| `moneyMaxLengthToPoint18Type` | BaseTypes.xsd | Тип: Неотрицательная сумма c максимальной длиной до точки 18 символов |
| `moneyMaxLengthToPoint29Type` | BaseTypes.xsd | Тип: Число c максимальной длиной до точки 29 символов и 11 символов после точки |
| `moneyPositiveType` | BaseTypes.xsd | Тип: Неотрицательная сумма |
| `moneyPosNegMaxLengthToPoint18Type` | BaseTypes.xsd | Тип: Cумма c максимальной длиной до точки 18 символов |
| `moneyType` | BaseTypes.xsd | Тип: Сумма |
| `monthType` | BaseTypes.xsd | Тип: Номер месяца |
| `MONumber` | BaseTypes.xsd | Тип: Номер ДО, присваиваемый в ПУР |
| `nameType` | BaseTypes.xsd | Тип: ФИО |
| `nameType` | IntegrationTPTypes.xsd | Тип: ФИО |
| `nationalProjectCode` | BaseTypes.xsd | Тип: Код национального проекта |
| `nationalProjectLevel` | BaseTypes.xsd | Тип: Уровень национального проекта. 1-национальный, 2-федеральный |
| `notificationNumberType` | IntegrationTypes.xsd |  |
| `NPASt14CodeType` | BaseTypes.xsd | Тип: Код Нормативно-правового акта, регулирующего допуск товаров, работ, услуг в соответствии со ст.14 Закона 44-ФЗ |
| `nsiAllListCodeType` | BaseTypes.xsd | Тип: Код справочника в Перечне всех справочников ЕИС |
| `nsiContractExecutionDocCodeType` | BaseTypes.xsd | Тип: Код типа документа исполнения контракта |
| `nsiContractExecutionDocNameType` | BaseTypes.xsd | Тип: Наименование типа документа исполнения контракта |
| `nsiKindType` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Тип: Вид выгрузки справочника |
| `nsiKindType` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Тип: Вид выгрузки справочника |
| `nsiKindType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Вид выгрузки справочника |
| `nsiKindType` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Тип: Вид выгрузки справочника |
| `nsiKindType` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Тип: Вид выгрузки справочника |
| `objectTypeEnum` | BaseTypes.xsd | Тип: Перечисление типов объектов: 94_OK - 94ФЗ Открытый конкурс; 94_EF - 94ФЗ Открытый аукцион в электронной форме; 94_ZK - 94ФЗ Запрос котировок; 94_PO - 94ФЗ Предварительный отбор; 94_SZ - 94ФЗ Сообщение о заинтересованности в проведении конкурса; 94_DD - 94ФЗ Разные документы; EF - Электронный аукцион; EP - Единственный поставщик; ISM - Иной способ, многолотовый; ISO - Иной способ, однолотовый;... |
| `objectTypeEnum` | QueueVBS\queue-vbs-ws-api.xsd | Тип: Перечисление типов объектов: BO - Бюджетные обязательства; MO - Денежные обязательства; ZKR - Заявки на кассовый расход |
| `obligationsTerminationReasonType` | BaseTypes.xsd | Тип: Причина прекращения обязательств (контракта): 1 - Окончание срока действия контракта; 2 - Ликвидация юридического лица, являющегося заказчиком; 3 - Ликвидация юридического лица, являющегося поставщиком (подрядчиком, исполнителем); 4 - Смерть гражданина, являющегося поставщиком (подрядчиком, исполнителем); |
| `obligationType` | BaseTypes.xsd | Тип:Тип обязательств (ЦРК): C - Обязательства по контракту; G - Гарантийные обязательства; O - Обеспечение исполнения по последующему обслуживанию, эксплуатации (при наличии) в течение срока службы, ремонту и (или) утилизации поставленного товара или созданного в результате выполнения работы объекта капитального строительства или товара; |
| `ogrnCodeType` | BaseTypes.xsd | Тип: Код ОГРН |
| `ogrnipCodeType` | BaseTypes.xsd | Тип: Код ОГРНИП |
| `ogrnType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Код ОГРН |
| `okeiCodeType` | BaseTypes.xsd | Тип: Код ОКЕИ |
| `okfsCodeType` | BaseTypes.xsd | Тип: Код ОКФС |
| `okopfCodeType` | BaseTypes.xsd | Тип: Код ОКОПФ |
| `okpdCodeType` | BaseTypes.xsd | Тип: Код ОКПД |
| `okpdNameType` | BaseTypes.xsd | Тип: Наименование товара, работы или услуги |
| `okpoCodeType` | BaseTypes.xsd | Тип: Код ОКПО |
| `oktmoCodeType` | BaseTypes.xsd | Тип: Код ОКТМО |
| `optionPenaltyHoldingType` | BaseTypes.xsd | Тип варианта удержания неустойки: А - Уменьшение суммы оплаты контрагенту; B - Перечисление суммы неустойки заказчиком на счет для учета дохода |
| `organizationRoleType` | BaseTypes.xsd | Полномочия организации: CU - Заказчик; RA - Уполномоченный орган; AI - Уполномоченное учреждение; SO - Специализированная организация, осуществляющая закупки в соответствии с Федеральным законом № 44-ФЗ и (или) Постановлением № 615; CO - Контрольный орган в сфере закупок; SP - Юридическое лицо, оказывающее услуги по обслуживанию пользователей единой информационной системы; FO - Финансовый орган; E... |
| `orgRegionKladrType` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Тип: Регион организации по КЛАДР |
| `orgRegionKladrType` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Тип: Регион организации по КЛАДР |
| `orgRegionKladrType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Регион организации по КЛАДР |
| `orgRegistryNumOFKType` | BaseTypes.xsd | Тип: Учетный номер организации, присваиваемый в ОрФК |
| `orgSubordinationLevelType` | BaseTypes.xsd | Тип: Уровень подчиненности организации |
| `participantStatusElectronicContractType` | BaseTypes.xsd | Тип: Статус поставщика для электронных контрактов: 10 - учреждение и предприятие уголовно-исполнительной системы; 20 - организация инвалидов; 30 - субъект малого предпринимательства; 31 - поставщик (подрядчик, исполнитель), который в соответствии с контрактом обязан привлечь к исполнению контракта субподрядчиков, соисполнителей из числа субъектов малого предпринимательства; 40 - социально-ориентир... |
| `participantStatusType` | BaseTypes.xsd | Тип: Статусы поставщика: 1 - субъект малого предпринимательства; 2 - учреждение и предприятие уголовно-исполнительной системы; 3 - организация инвалидов; 4 - социально ориентированная некоммерческая организация. |
| `participantType` | BaseTypes.xsd | Тип: Виды поставщика: L - Юридическое лицо РФ; F - Филиал юридического лица РФ. |
| `participantTypeEnum` | BaseTypes.xsd | Тип: Виды поставщика: U - Юридическое лицо РФ; UF - Юридическое лицо иностранного государства; B - Индивидуальный предприниматель РФ. |
| `partnerType` | eis-fs-ws-api.xsd | Тип: Перечисление контрагентов: OOS - Единая информационная система; GIIS_EB - Государственная интегрированная информационная система Электронный бюджет (ГИИС ЭБ); RMIS - Региональная (муниципальная) информационная система (РМИС); OVK - Информационная система органа внутреннего контроля (ИС ОВК); OA - Информационная система органа аудита (ИС ОА); KO - Информационная система контрольного органа (ИС... |
| `partnerType` | eisSignIncoming.xsd | Тип: Перечисление контрагентов: OOS - Единая информационная система; GIIS_EB - Государственная интегрированная информационная система Электронный бюджет (ГИИС ЭБ); RMIS - Региональная информационная система (РИС); OVK - Информационная система органа внутреннего контроля (ИС ОВК); OA - Информационная система органа аудита (ИС ОА); KO - Информационная система контрольного органа (ИС КО); FAS - Инфор... |
| `partyCodeType` | BaseTypes.xsd | Тип: Производственная партия (КОД) |
| `payDocumentType` | BaseTypes.xsd | Тип: Тип платежного документа (ЦРК): PC - Оплата контрагенту; PT - Оплата налогов, сборов; PE - Оплата по исполнительному листу; PN - Оплата неустойки (штрафа, пени); RC - Возврат оплаты контрагенту; RE - Возврат оплаты по исполнительному листу; RN - Возврат неустойки (штрафа, пени); PG - Перечисление суммы удержания гарантом; RG - Возврат суммы удержания гаранту |
| `penaltyType` | BaseTypes.xsd | Тип штрафа/пени в исполнении контракта |
| `percentD2Type` | BaseTypes.xsd | Тип: Процент с двумя знаками в дробной части |
| `percentRestr0100D11Type` | BaseTypes.xsd | Тип: Процент с ограничениеми 0..100 и одиннадцатью знаками в дробной части |
| `percentRestr0100D2TextType` | BaseTypes.xsd | Тип: Процент с двумя знаками в дробной части (текстовое поле) |
| `percentRestr0100D2Type` | BaseTypes.xsd | Тип: Процент с ограничениеми 0..100 и двумя знаками в дробной части |
| `percentRestr0100Type` | BaseTypes.xsd | Тип: Процент с ограничениеми 0..100 |
| `personalAccountKSType` | BaseTypes.xsd | Тип: Лицевой счет для казначейского сопровождения |
| `personalAccountType` | BaseTypes.xsd | Тип: Лицевой счет |
| `PFHDType` | BaseTypes.xsd | Тип: Тип ПФХД: IND - индивидуальный; CONS - сводный |
| `phoneType` | BaseTypes.xsd | Тип: Номер телефона/факса |
| `placementResultEnumType` | BaseTypes.xsd | Тип: Результат определения поставщика: CC - Заключение контракта; RC - Отказ или уклонение от заключения контракта |
| `placerRoleContractProjectEnum` | BaseTypes.xsd | Тип: Роль организации, организации, разместившей контракт: CU - Заказчик; RA - Уполномоченный орган; AI - Уполномоченное учреждение; OA - Организация, осуществляющая полномочия заказчика на основании соглашения в соответствии с частью 6 статьи 15 Федерального закона № 44-ФЗ; CS - Организация, осуществляющая закупки в соответствии с частью 5 статьи 15 Федерального закона № 44-ФЗ; RO - Специализиров... |
| `placingWayCodeType` | BaseTypes.xsd | Тип: Код способа размещения заказа (определения поставщика) |
| `positionType` | BaseTypes.xsd | Тип: Должность |
| `posNegQuantity18p11Type` | BaseTypes.xsd | Тип: Количество с 18 знаками до запятой и 11 знаками после запятой с возможностью указания отрицательного значения |
| `posNegQuantity20p2Type` | BaseTypes.xsd | Тип: Количество с 20 знаками до запятой и 2 знаками после запятой с возможностью указания отрицательного значения |
| `prefsReqsShortNameType` | BaseTypes.xsd | Тип: Крaткое наименование преимущества (требования, ограничения) |
| `preparedArchivesType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Перечисление типов предподготовленных архивов |
| `prescriptionNumberType` | BaseTypes.xsd | Тип: Номер предписания, выданного КО |
| `priceContractPeriodType` | BaseTypes.xsd | Тип: Период времени, в течение которого участник закупки вправе подать с использованием электронной площадки предложение (предложения) о цене контракта |
| `printFormFileType` | BaseTypes.xsd | Тип файла печатной формы |
| `priorityType` | BaseTypes.xsd | Тип: Приоритет отдачи документа. 1 - минимальный приоритет, 5 - максимальный. Приоритет по умолчанию - 3 |
| `priorityType` | fcsIntegration.xsd | Тип: приоритет пакета: 0 - обычный приоритет; 1 - повышенный проритет. |
| `productHierarchyTypeEnumType` | BaseTypes.xsd | Тип: Тип объекта закупки в иерархии. Допустимые значения: ND - Недетализированный объект закупки; CH - Дочерний; P - Родитель |
| `productTypeEnumType` | BaseTypes.xsd | Тип: Тип объекта закупки PRODUCT - товар; WORK - работа; SERVICE - услуга |
| `protocolEvDevTypeEnum` | BaseTypes.xsd | Тип: Типы протоколов: ПОК/ППУ |
| `protocolTypeEnum` | BaseTypes.xsd | Тип: Типы протоколов, принимаемых от ЭТП |
| `provisionMethodType` | BaseTypes.xsd | Тип:Способ обеспечения: BG – «Независимая гарантия» FD –«Денежные средства» |
| `publicDiscussionNumType` | BaseTypes.xsd | Тип: Реестровый номер общественного обсуждения |
| `publicDiscussionPlaceEnum` | BaseTypes.xsd | Тип: Место проведения общественного обсуждения: E - в разделе «Общественные обсуждения крупных закупок» Официального сайта Единой информационной системы в сфере закупок; F - на форуме Официального сайта Единой информационной системы в сфере закупок. |
| `purchaseNumber615or44Type` | BaseTypes.xsd | Тип: Номер закупки по ПП РФ № 615 или 44-ФЗ |
| `purchaseNumber615Type` | BaseTypes.xsd | Тип: Номер закупки по ПП РФ № 615 |
| `purchaseNumberType` | BaseTypes.xsd | Тип: Номер закупки |
| `purchaseSubjectCodeType` | BaseTypes.xsd | Тип: Код предмета электронного аукциона по ПП РФ № 615 |
| `qualifiedContractorCodeType` | BaseTypes.xsd | Тип: Номер реестровой записи реестра квалифицированных подрядных организаций |
| `qualitativeCriterionCodeEnum` | BaseTypes.xsd | Тип: Качественные критерии оценки заявок участников: QF - Качественные, функциональные и экологические характеристики объекта закупки. QO - Квалификация участников закупки, в том числе наличие у них финансовых ресурсов, оборудования и других материальных ресурсов, принадлежащих им на праве собственности или на ином законном основании, опыта работы, связанного с предметом контракта, и деловой репут... |
| `quantity12p11Type` | BaseTypes.xsd | Тип: Количество с 12 знаками до запятой и 11 знаками после запятой |
| `quantity14p11Type` | BaseTypes.xsd | Тип: Количество с 14 знаками до запятой и 11 знаками после запятой |
| `quantity18p11Type` | BaseTypes.xsd | Тип: Количество с 18 знаками до запятой и 11 знаками после запятой |
| `quantity20p2Type` | BaseTypes.xsd | Тип: Количество с 20 знаками до запятой и 2 знаками после запятой |
| `quantity27p11Type` | BaseTypes.xsd | Тип: Количество с 27 знаками до запятой и 11 знаками после запятой |
| `quantityContractSubjectNumType` | BaseTypes.xsd | Тип: Порядковый номер сведений об объеме и других характеристиках поставленных товаров, выполненных работ, оказанных услуг |
| `quantityLabelingProductType` | BaseTypes.xsd | Тип: Количество товара в единицах измерения маркированного товара средствами идентификации |
| `quantityMultiplierType` | BaseTypes.xsd | Тип: Коэффициент кратности количества |
| `quantityType` | BaseTypes.xsd | Тип: Количество ТРУ |
| `rateValueFarmDrugInterchangeGroupType` | BaseTypes.xsd | Тип: Тип коэффициента приведения в справочнике "Группы взаимозаменяемости лекарственных препаратов" |
| `RBGDocumentKindType` | docs-https-api.xsd | Тип: Вид документа РНГ bankGuarantee - Информация о выданной независимой гарантии; bankGuaranteeInvalid - Информация о недействительности сведений о независимой гарантии; bankGuaranteeRefusal - Сведения об отказе заказчика в принятии независимой гарантии; внесение изменений; bankGuaranteeRefusalInvalid - Сведения о недействительности отказа заказчика в принятии независимой гарантии; bankGuaranteeT... |
| `refundType` | BaseTypes.xsd | Тип: Тип возврата (ЦРК): RB - Возврат от банка получателя; AR - Дебиторская задолженность прошлых лет; RC - Возврат от контрагента |
| `registrationNumber223Type` | BaseTypes.xsd | Тип: Регистрационный номер извещения (приглашения) 223ФЗ |
| `registryType` | BaseTypes.xsd | Тип: Тип реестра |
| `regNum223Type` | BaseTypes.xsd | Тип: Реестровый номер заказчика по 223 |
| `regNumberBaseType` | BaseTypes.xsd | Тип: Общий тип для реестрового номера в интегарционных пакетах |
| `regNumPOAType` | BaseTypes.xsd | Тип: Реестровый номер доверенности в ЕИС |
| `regNumType` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Тип: Реестровый номер в подсистеме |
| `regNumType` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Тип: Реестровый номер в подсистеме |
| `regNumType` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Реестровый номер в подсистеме |
| `regNumType` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Тип: Реестровый номер в подсистеме |
| `regNumType` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Тип: Реестровый номер в подсистеме |
| `rejectReasonCode` | BaseTypes.xsd | Тип: Код причины для отказа в допуске заявки |
| `rejectReasonName` | BaseTypes.xsd | Тип: Наименование причины для отказа в допуске заявки |
| `reportMeasuresStatusType` | BaseTypes.xsd | Тип: Статус отчета о проведенных мероприятиях в сфере закупок PREP - На подготовке PUBL - Размещено |
| `responsibleRoleCETypeEnum` | BaseTypes.xsd | Тип: Роль организации, организации, разместившей контракт для информации об исполнении (расторжении) контракта: CU - Заказчик; OA - Организация, осуществляющая полномочия заказчика на осуществление закупок на основании договора (соглашения); CS - Заказчик, осуществляющий закупки в соответствии с частью 4, 4.3 или 4.4 статьи 15 Федерального закона № 44-ФЗ; SR - Преемник прав и обязанностей организа... |
| `responsibleRoleEFType` | BaseTypes.xsd | Тип: Роль организации, осуществляющей закупку по электронному аукциону ПП РФ № 615: RO - Специализированная некоммерческая организация, которая осуществляет деятельность, направленную на обеспечение проведения капитального ремонта общего имущества в многоквартирных домах в соответствии с Постановлением № 615 (региональный оператор); TC - Орган местного самоуправления и (или) государственное, муниц... |
| `responsibleRoleEPType` | BaseTypes.xsd | Тип: Роль организации, осуществляющей закупку по электронным процедурам: CU - Заказчик; OCU - Заказчик в качестве организатора совместного аукциона; RA - Уполномоченный орган; ORA- Уполномоченный орган в качестве организатора совместного конкурса (аукциона) согласно ст. 25 №44ФЗ; AI - Уполномоченное учреждение; OAI- Уполномоченное учреждение в качестве организатора совместного конкурса (аукциона) ... |
| `responsibleRoleMFOType` | BaseTypes.xsd | Тип: Роль организации, осуществляющей закупку для МФО: CU - Заказчик; OCU - Заказчик в качестве организатора совместного аукциона; RA - Уполномоченный орган; ORA- Уполномоченный орган в качестве организатора совместного конкурса (аукциона) согласно ст. 25 №44ФЗ; AI - Уполномоченное учреждение; OAI- Уполномоченное учреждение в качестве организатора совместного конкурса (аукциона) согласно ст. 25 №4... |
| `responsibleRolePOType` | BaseTypes.xsd | Тип: Роль организации, осуществляющей закупку по предварительному отбору квалифицированных подрядных организаций ПП РФ № 615: RPO - Орган, уполномоченный на ведение реестра квалифицированных подрядных организаций в соответствии с Постановлением № 615. |
| `responsibleRoleRKPOType` | BaseTypes.xsd | Тип: Роль организации, осуществляющей закупку РКПО ПП РФ № 615 RPO - Орган, уполномоченный на ведение реестра квалифицированных подрядных организаций в соответствии с Постановлением № 615; RO - Специализированная некоммерческая организация, которая осуществляет деятельность, направленную на обеспечение проведения капитального ремонта общего имущества в многоквартирных домах в соответствии с Постан... |
| `rightSideKTRUCodeType` | BaseTypes.xsd | Тип: Код позиции ПЧ КТРУ |
| `RNPOthersCodeType` | BaseTypes.xsd | Тип: Код типа иного лица, добавляемого в РНП |
| `schemeVersionType` | BaseTypes.xsd | Тип: Версия схемы |
| `serviceWorkCodeType` | BaseTypes.xsd | Тип: Код вида услуги или работы в соотвествии со ст. 166 Жилищного кодекса РФ |
| `settlementAccountType` | BaseTypes.xsd | Тип: Расчетный счет |
| `shortNameType` | eis-fs-ws-api.xsd | Тип: Короткое текстовое поле |
| `sIdStringType` | BaseTypes.xsd | Тип: Уникальный идентификатор (строковый) |
| `sIdType` | BaseTypes.xsd | Тип: Уникальный идентификатор (целочисленный) |
| `signatureKindType` | BaseTypes.xsd | Тип: Вид подписи: PRIMARY - первичная; REINFORCED - усиленная; CRYPTO_RECEIPT - криптоквитанция |
| `signatureType` | BaseTypes.xsd | Тип подписи |
| `signatureUserType` | BaseTypes.xsd | Тип: Тип контрагента (Поставщик, Заказчик) |
| `signingResultNoticeDocKindType` | BaseTypes.xsd | Тип подписываемого документа в квитанции с результатами подписания: notification - извещение об осуществлении закупки/изменение извещения; notificationCancel - извещение об отмене процедуры определения поставщика (подрядчика, исполнителя) notificationCancelFailure - отмена извещения об отмене определения поставщика (подрядчика, исполнителя) в электронной форме; protocolEvasion - протокол об отказе... |
| `SNILSType` | BaseTypes.xsd | Тип: СНИЛС |
| `spzNumType` | BaseTypes.xsd | Тип: Код по СПЗ |
| `spzNumType` | eis-fs-ws-api.xsd | Тип: Код по СПЗ |
| `spzNumType` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Тип: Код по СПЗ |
| `stageOrderNumberType` | BaseTypes.xsd | Тип: Порядковый номер этапа в ЕИС |
| `standardContractNumberType` | BaseTypes.xsd | Тип: Номер типового контракта, типовых условий контракта |
| `statusCodeType` | BaseTypes.xsd | Код статуса поставщика: SMP - Субъект малого предпринимательства (значение по умолчанию); SONO - Социально ориентированная некоммерческая организация |
| `subsystem223DocStoreType` | BaseTypes.xsd | Тип: Перечисление подсистем ЕИС (223-ФЗ), документы которых отдаются из ХД сервисами отдачи |
| `subsystem223Type` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Перечисление подсистем 223ФЗ: RD223 - Реестр договоров; RJ223 - Реестр жалоб; RPP223 - Реестр плановых проверок; RPZ223 - Реестр планов закупок; RI223 - Реестр извещений о закупках; RZ223 - Реестр заказчиков; OV223 - Информация об объеме выручки; TPOZ223 - Типовые положения о закупках; POZ223 - Положения о закупках; RNP223 - Реестр недобросовестных поставщиков; OD223 - Отчетность по договорам... |
| `subsystemBank44Type` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Тип: Перечисление подсистем 44ФЗ, которые могут быть заданы при запросе документов Банков: RBGB - Реестр независимых гарантий |
| `subsystemDocStoreType` | BaseTypes.xsd | Тип: Перечисление подсистем ЕИС (44-ФЗ), документы которых отдаются из ХД сервисами отдачи |
| `subsystemType` | BaseTypes.xsd | Тип: Перечисление подсистем ЕИС: PRIZ - подсистема определения поставщика; RGK - реестр контрактов; RPG - реестр планов-графиков; RPZ - реестр планов закупок. RBG - реестр независимой гарантий. OZ - реестр отчетов заказчиков; RDI - реестр дополнительной информации о закупках и контрактах; OOKZ - обязательное обсуждение крупных закупок; RPNZ - реестр правил нормирования закупок; ZC - реестр размеще... |
| `subsystemType` | eis-fs-ws-api.xsd | Тип: Перечисление подсистем ЕИС: PRIZ - подсистема определения поставщика; RGK - реестр контрактов; RPG - реестр планов-графиков; RPZ - реестр планов закупок. RBG - реестр банковских гарантий. OZ - реестр отчетов заказчиков; RDI - реестр дополнительной информации о закупках и контрактах; OOKZ - обязательное обсуждение крупных закупок; RPNZ - реестр правил нормирования закупок; ZC - реестр размещен... |
| `t1000Type` | BaseTypes.xsd | Тип: Текстовое поле размерностью от 0 до 1000 символов |
| `t100Type` | BaseTypes.xsd | Тип: Текстовое поле размерностью от 0 до 100 символов |
| `t11Type` | BaseTypes.xsd | Тип: Текстовое поле размерностью от 0 до 11 символов |
| `t2000Type` | BaseTypes.xsd | Тип: Текстовое поле размерностью от 0 до 2000 символов |
| `t256Type` | BaseTypes.xsd | Тип: Текстовое поле размерностью от 0 до 256 символов |
| `t2Type` | BaseTypes.xsd | Тип: Текстовое поле размерностью от 0 до 2 символов |
| `t30Type` | BaseTypes.xsd | Тип: Текстовое поле размерностью от 0 до 30 символов |
| `t350Type` | BaseTypes.xsd | Тип: Текстовое поле размерностью от 0 до 350 символов |
| `t510Type` | BaseTypes.xsd | Тип: Текстовое поле размерностью от 0 до 510 символов |
| `t5Type` | BaseTypes.xsd | Тип: Текстовое поле размерностью от 0 до 5 символов |
| `t6Type` | BaseTypes.xsd | Тип: Текстовое поле размерностью от 0 до 6 символов |
| `t8Type` | BaseTypes.xsd | Тип: Текстовое поле размерностью от 0 до 8 символов |
| `targetArticleType` | BaseTypes.xsd | Тип: Целевая статья |
| `taxPayerCode` | BaseTypes.xsd | Тип: Код налогоплательщика в стране регистрации или его аналог |
| `tenderPlan2017PositionNumberType` | BaseTypes.xsd | Тип: Реестровый номер позиции (уникальный реестровый номер закупки) в плане-графике с 01.01.2017 |
| `tenderPlan2017RegNumberType` | BaseTypes.xsd | Тип: Реестровый номер плана-графика с 01.01.2017 |
| `tenderPlan2020AgreementNumberType` | IntegrationTPTypes.xsd | Тип: Номер соглашения |
| `tenderPlan2020AgreementTypeCodeEnum` | IntegrationTPTypes.xsd | Код типа соглашения о предоставлении субсидии: CAPITAL - На капитальные вложения; OTHER - Иное. |
| `tenderPlan2020NumberType` | IntegrationTPTypes.xsd | Реестровый номер плана-графика закупок |
| `tenderPlan2020OtherPeriodicityType` | IntegrationTPTypes.xsd | Тип: Другая периодичность |
| `tenderPlan2020PositionModificationStatusEnum` | IntegrationTPTypes.xsd | Тип: Статус позиции при приеме изменений планов закупок: N - Данные позиции перенесены из предыдущей версии плана закупки без изменений; E - Данные позиции отредактированы; |
| `tenderPlan2020PositionNumberType` | BaseTypes.xsd | Тип: Реестровый номер позиции (уникальный реестровый номер закупки) в плане-графике закупок с 01.01.2020 |
| `tenderPlan2020PositonExtNumberType` | IntegrationTPTypes.xsd | Тип: Внешний номер позиции плана-графика закупок |
| `tenderPlan2020PositonNumberType` | IntegrationTPTypes.xsd | Номер позиции плана-графика закупок |
| `tenderPlan2020PurchaseNumberType` | BaseTypes.xsd | Тип: Номер закупки, включенной в план-график закупок с 01.01.2020 |
| `tenderPlan2020PurchaseNumberType` | IntegrationTPTypes.xsd | Номер закупки, включенной в план-график закупок |
| `tenderPlan2020PurchaseOrderNumberType` | BaseTypes.xsd | Тип: Порядковый номер закупки, включенной в план-график с 01.01.2020 |
| `tenderPlan2020PurchaseOrderNumberType` | IntegrationTPTypes.xsd | Порядковый номер закупки |
| `tenderPlan2020RegNumberType` | BaseTypes.xsd | Тип: Реестровый номер плана-графика закупок с 01.01.2020 |
| `tenderPlan2020VersionOwnerRoleType` | IntegrationTPTypes.xsd | Роль организации-владельца версии плана-графика закупок c 01.01.2020: CU - Заказчик; OA - Организация, осуществляющая полномочия заказчика на осуществление закупок на основании договора (соглашения). |
| `tenderStageType` | BaseTypes.xsd | Тип: Этап размещения заказа по 44ФЗ |
| `terminationCancelType` | BaseTypes.xsd | Тип: Тип отмены расторжения: 1 - Отмена расторжения по решению суда; 2 - Отмена признания контракта недействительным по решению суда; |
| `terminationContractType` | BaseTypes.xsd | Тип: Вид прекращения: AP соглашение сторон UR односторонний отказ CD решение суда IC признание контракта недействительным |
| `terminationGround615CodeType` | BaseTypes.xsd | Тип: Код основания расторжения договора по капитальному ремонту ПП РФ № 615 |
| `terminationReason615CodeType` | BaseTypes.xsd | Тип: Код причины расторжения договора по капитальному ремонту ПП РФ № 615 |
| `terminationType` | BaseTypes.xsd | Тип: Тип расторжения: 1 - Расторжение по соглашению сторон (в электронном виде); 2 - Расторжение по соглашению сторон (в бумажном виде); 3 - Расторжение по решению суда; 4 - Признание контракта недействительным по решению суда; |
| `text10000Type` | BaseTypes.xsd | Тип: Текстовое поле 10000 символов |
| `text1000Type` | BaseTypes.xsd | Тип: Текстовое поле 1000 символов |
| `text100Type` | BaseTypes.xsd | Тип: Текстовое поле 100 символов |
| `text10Type` | BaseTypes.xsd | Тип: Текстовое поле 10 символов |
| `text15000Type` | BaseTypes.xsd | Тип: Текстовое поле 15000 символов |
| `text15Type` | BaseTypes.xsd | Тип: Текстовое поле 15 символов |
| `text160Type` | BaseTypes.xsd | Тип: Текстовое поле 160 символов |
| `text19Type` | BaseTypes.xsd | Тип: Текстовое поле 19 символов |
| `text2000Type` | BaseTypes.xsd | Тип: Текстовое поле 2000 символов |
| `text200Type` | BaseTypes.xsd | Тип: Текстовое поле 200 символов |
| `text20Type` | BaseTypes.xsd | Тип: Текстовое поле 20 символов |
| `text250Type` | BaseTypes.xsd | Тип: Текстовое поле 250 символов |
| `text255Type` | BaseTypes.xsd | Тип: Текстовое поле 255 символов |
| `text256Type` | BaseTypes.xsd | Тип: Текстовое поле 256 символов |
| `text2Type` | BaseTypes.xsd | Тип: Текстовое поле 2 символов |
| `text300Type` | BaseTypes.xsd | Тип: Текстовое поле 300 символов |
| `text30Type` | BaseTypes.xsd | Тип: Текстовое поле 30 символов |
| `text33Type` | BaseTypes.xsd | Тип: Текстовое поле 33 символов |
| `text350Type` | BaseTypes.xsd | Тип: Текстовое поле 350 символов |
| `text4000Type` | BaseTypes.xsd | Тип: Текстовое поле 4000 символов |
| `text400Type` | BaseTypes.xsd | Тип: Текстовое поле 400 символов |
| `text40Type` | BaseTypes.xsd | Тип: Текстовое поле 40 символов |
| `text4Type` | BaseTypes.xsd | Тип: Текстовое поле 4 символов |
| `text5000Type` | BaseTypes.xsd | Тип: Текстовое поле 5000 символов |
| `text500Type` | BaseTypes.xsd | Тип: Текстовое поле 500 символов |
| `text50Type` | BaseTypes.xsd | Тип: Текстовое поле 50 символов |
| `text510Type` | BaseTypes.xsd | Тип: Текстовое поле 510 символов |
| `text5Type` | BaseTypes.xsd | Тип: Текстовое поле 5 символов |
| `text6Type` | BaseTypes.xsd | Тип: Текстовое поле 6 символов |
| `text8000Type` | BaseTypes.xsd | Тип: Текстовое поле 8000 символов |
| `text8Type` | BaseTypes.xsd | Тип: Текстовое поле 8 символов |
| `text9Type` | BaseTypes.xsd | Тип: Текстовое поле 9 символов |
| `textExactly2Type` | BaseTypes.xsd | Тип: Текстовое поле ровно 2 символа |
| `textExactly3Type` | BaseTypes.xsd | Тип: Текстовое поле ровно 3 символа |
| `timeZoneDifferenceType` | BaseTypes.xsd | Тип: Разница во времени |
| `timeZoneNameType` | BaseTypes.xsd | Тип: Наименование часового пояса |
| `transferNoticeNumberType` | BaseTypes.xsd | Тип: Номер уведомления о передаче жалобы по повдедомственности / ведомственной принадлежности |
| `transferNoticeType` | BaseTypes.xsd | Тип: Тип уведомления о передаче жалобы. Допустимые значения:DT - Передача жалобы по ведомственной принадлежности; TR - Передача жалобы по подведомственности |
| `transferNoticeUnplannedCheckType` | BaseTypes.xsd | Тип: Тип уведомления о передаче внеплановой проверки. Допустимые значения:DT - Передача внеплановой проверки по ведомственной принадлежности; TR - Передача внеплановой проверки по подведомственности |
| `treasurySupportContractEnum` | BaseTypes.xsd | Тип: Тип казначейского сопровождения: ALL - Все расчеты по контракту подлежат казначейскому сопровождению; ADV - Расчеты по контракту в части выплаты аванса подлежат казначейскому сопровождению |
| `unfairSupplier2022CreateReasonEnum` | BaseTypes.xsd | Тип: Причина для внесения в РНП с 01.04.2022. Допустимые значения: WINNER_DEVIATION - уклонение победителя от заключения контракта; ONE_WINNER_DEVIATION - уклонение единственного участника от заключения контракта; PARTICIPANT_DEVIATION_IF_WINNER_DEVIATION - уклонение участника размещения заказа от заключения контракта в случае, когда победитель уклонился от заключения контракта; CANCEL_CONTRACT - ... |
| `unfairSupplier2022ExcludeDescType` | BaseTypes.xsd | Тип: Краткое описание исключения для РНП с 01.04.2022 |
| `unfairSupplier2022ExcludeDocNumberType` | BaseTypes.xsd | Тип: Номер документа об исключениии для РНП с 01.04.2022 |
| `unfairSupplier2022ExcludeTypeEnum` | BaseTypes.xsd | Тип: Тип исключения из РНП с 01.04.2022. Допустимые значения: AUTO- автоматическое исключение (запись исключена из Рeeстра по прошествии двух лет); MANUAL - исключено пользователем (запись исключена пользователем из Реестра вручную) |
| `unfairSupplier2022RegNumType` | BaseTypes.xsd | Тип: Номер реестровой записи РНП с 01.04.2022 |
| `unfairSupplierOrderNumberType` | BaseTypes.xsd | Тип РНП: Номер приказа/решения |
| `URDocCodeType` | BaseTypes.xsd | Тип: Код типа документа |
| `UUID32Type` | BaseTypes.xsd | Тип: Универсальный уникальный идентификатор 32 символа в верхнем регистре |
| `valueType` | BaseTypes.xsd | Тип: Значимость критерия/показателя |
| `VATRateEnum` | BaseTypes.xsd | Тип: Ставка НДС, процентов. Допустимые значения: 0 - 0%; 10 - 10%; 18 - 18%; 20 - 20%. n-без НДС. |
| `VATRateValueType` | BaseTypes.xsd | Тип: Значение ставки НДС |
| `versionKTRUStatusType` | BaseTypes.xsd | Тип: Перечисление статусов размещенной версии КТРУ |
| `versionNumberType` | BaseTypes.xsd | Тип: Номер версии |
| `versionNumberType1` | BaseTypes.xsd | Тип: Номер версии, начинающийся с 1 |
| `violationLevelType` | BaseTypes.xsd | Тип: Нарушения в протоколе приема |
| `violationLevelType` | eisSignIncoming.xsd | Тип нарушения |
| `volumeSpecifyingMethodEnum` | BaseTypes.xsd | Тип: Способ указания объема выполнения работы, оказания услуги. Допустимые значения: QF - Объем может быть указан в количественном выражении; VTF - Объем не может быть указан в количественном выражении (указание объема в текстовом виде) |
| `wfOperatorIDType` | BaseTypes.xsd | Тип: Идентификатор оператора документооборота |
| `wfParticipantIDType` | BaseTypes.xsd | Тип: Идентификатор участника документооборота |
| `withHoldingType` | BaseTypes.xsd | Тип:Тип удержания: C – «Удержание из оплаты контрагенту» O – «Удержание из обеспечения» |
| `wsObjectTypeEnum` | BaseTypes.xsd | Тип: Перечисление типов объектов в "бесшовной" интеграции: TP - План график; SM - Служебные сообщения. |
| `wsPartnerType` | BaseTypes.xsd | Тип: Перечисление контрагентов сервисного взаимодействия: OOS - Единая информационная система; OOS-MZ - Единая информационная система (малые закупки); GIIS_EB - Государственная интегрированная информационная система Электронный бюджет (ГИИС ЭБ); RMIS - Региональная (муниципальная) информационная система (РМИС); OVK - Информационная система органа внутреннего контроля (ИС ОВК); OA - Информационная ... |
| `yearNewType` | BaseTypes.xsd | Тип: Номер года (новый) |
| `yearType` | BaseTypes.xsd | Тип: Номер года |
| `zfcs_abandonedReasonTypeEnum` | IntegrationTypes.xsd | Тип основания: OR - По окончании срока подачи заявок подана только одна заявка. Такая заявка признана соответствующей требованиям 44-ФЗ и требованиям, указанным в извещении; NR - По окончании срока подачи заявок не подано ни одной заявки; OV - По результатам рассмотрения заявок только одна заявка признана соответствующей требованиям ФЗ и требованиям, указанным в извещении; NV - Все поданные заявки... |
| `zfcs_accountNumType` | fcsPrintForm.xsd | Номер лицевого счета заказчика |
| `zfcs_addInfoTypeEnum` | IntegrationTypes.xsd | Тип дополнительной информации: O - Решение заказчика об одностороннем отказе от исполнения контракта; B - Информация о непредоставлении участником закупки сведений о выгодоприобретателях; S - Информация о непредоставлении участником закупки сведений о субподрядчиках, соисполнителях. |
| `zfcs_admissionResultsEnum` | IntegrationTypes.xsd | Результат оценки в текстовом представлении, возможные значения: WIN_OFFER – Победитель; LIKE_WIN_OFFER – Предложение о цене контракта такое же, как у победителя; SECOND_OFFER – Лучшее предложение о цене контракта после победителя; PASS_OFFER – Все остальные заявки; ADMITTED_OFFER – Заявка допущена (только при рассмотрении единственной поданной заявки). |
| `zfcs_appealStatusType` | IntegrationTypes.xsd | Тип: Статус обжалования: DC-Решение (акт, заключение, предписание) отменено; DCP-Решение (акт, заключение, предписание) отменено частично; DU–Решение (акт, заключение, предписание) оставлено в силе. |
| `zfcs_auditResultTypeEnum` | IntegrationTypes.xsd | Вид обобщенной информации: E - Результаты экспертно-аналитической деятельности; C - Результаты контрольной деятельности; I - Результаты информационной деятельности; O - Результаты иной деятельности; R - Результаты аудита привлечения подрядных организаций к выполнению работ по капитальному ремонту многоквартирных домов. |
| `zfcs_bankGaranteeModificationType` | IntegrationTypes.xsd | Тип: Тип изменения независимой гарантии |
| `zfcs_bankGuaranteeCreditOrgNumberType` | IntegrationTypes.xsd | Тип: Номер независимой гарантии, присвоенный гарантом |
| `zfcs_bankGuaranteeNumberType` | IntegrationTypes.xsd | Тип: Номер независимой гарантии |
| `zfcs_bankGuaranteeRefusalPlacerOrgType` | IntegrationTypes.xsd | Роль организации, осуществляющей размещение отказа заказчика в принятии БГ: CU - Заказчик; OCU - Заказчик в качестве организатора совместного аукциона; RA - Уполномоченный орган; AI - Уполномоченное учреждение; CS - Организация, осуществляющая закупки в соответствии с частью 5 статьи 15 Федерального закона № 44-ФЗ; OA - Организация, осуществляющая полномочия заказчика на основании соглашения в соо... |
| `zfcs_budgetLevelContract2015Type` | IntegrationTypes.xsd | Уровень бюджета для контрактов с 01.01.2015: 10 - федеральный бюджет; 20 - бюджет субъекта Российской Федерации; 30 - местный бюджет; 41 - бюджет Пенсионного фонда Российской Федерации; 42 - бюджет Фонда социального страхования Российской Федерации; 43 - бюджет Федерального фонда обязательного медицинского страхования; 50 - бюджет территориального государственного внебюджетного фонда; 11 - федерал... |
| `zfcs_budgetLevelType` | IntegrationTypes.xsd | Уровень бюджета: 00 - не указывается; 01 - федеральный бюджет; 02 - бюджет субъекта Российской Федерации; 03 - местный бюджет; 04 - бюджет Пенсионного фонда Российской Федерации; 05 - бюджет Федерального фонда обязательного медицинского страхования; 06 - бюджет Фонда социального страхования Российской Федерации; 07 - бюджет территориального государственного внебюджетного фонда. |
| `zfcs_buildAbleEnumType` | IntegrationTypes.xsd | Тип: Зависимость записи от справочника групп работ по строительству. Допустимые значения: 1-причина изменения условий контракта не зависит от справочника групп работ по строительству, 2-причина изменений условий контракта не может быть использована одновременно со справочником групп работ по строительству, 3-причина изменений условий контракта может быть использована одновременно со справочником г... |
| `zfcs_checkNumberType` | IntegrationTypes.xsd | Номер проверки в составе плана проверок, сформированный контрольным органом |
| `zfcs_checkPlanNumberType` | IntegrationTypes.xsd | Номер реестровой записи плана проверки, сформированный контрольным органом |
| `zfcs_checkResult.agreementResultType` | IntegrationTypes.xsd | Результат согласования |
| `zfcs_checkResult.checkResultType` | IntegrationTypes.xsd | Результат проведения проверки |
| `zfcs_checkResult.complaintResultType` | IntegrationTypes.xsd | Результат рассмотрения жалобы |
| `zfcs_checkResult.includingUnfairSupplerType` | IntegrationTypes.xsd | Информация о включении участника закупки, поставщика (подрядчика, исполнителя) в РНП |
| `zfcs_checkResult.resultType` | IntegrationTypes.xsd | Значения результатов контроля |
| `zfcs_checkResultCancel.cancelType` | IntegrationTypes.xsd | Значения отмены результатов контроля |
| `zfcs_complaint.regType` | IntegrationTypes.xsd | Тип подачи жалобы (ручная, электронная, интеграция) |
| `zfcs_complaintApplicantType` | IntegrationTypes.xsd | Тип заявителя: P - Физическое лицо; U - Юридическое лицо; I - Индивидуальный предприниматель |
| `zfcs_complaintNumberType` | IntegrationTypes.xsd | Номер реестровой записи жалобы, сформированный контрольным органом |
| `zfcs_complaintPhoneType` | IntegrationTypes.xsd | Номер телефона/факса в контрольных реестрах |
| `zfcs_contract.contractStageType` | IntegrationTypes.xsd | Состояние контракта E Исполнение ET Исполнение прекращено EC Исполнение завершено IN Aннулировано |
| `zfcs_contract.defenseNum2015Type` | IntegrationTypes.xsd | Тип: Номер государственного контракта по государственному оборонному заказу |
| `zfcs_contract.docRegNumType` | IntegrationTypes.xsd | Реестровый номер документа государственного или муниципального контракта |
| `zfcs_contract.Number2015Type` | IntegrationTypes.xsd | Номер государственного или муниципального контракта с 01.01.2015 |
| `zfcs_contract.NumberType` | IntegrationTypes.xsd | Номер государственного или муниципального контракта |
| `zfcs_contract.purchasePlacing94Type` | IntegrationTypes.xsd | Способ размещения заказа 94-ФЗ составлен из способов 44ФЗ, с добавленными способами 12 и 13 1 - открытый конкурс; 7 - аукцион в электронной форме; 9 - запрос котировок; 11 - закупка у единственного поставщика (подрядчика, исполнителя); 12 - открытый аукцион; 13 - предварительный отбор и запрос котировок при чрезвычайных ситуациях. |
| `zfcs_contract.purchasePlacingType` | IntegrationTypes.xsd | Способ определения поставщиков(подрядчиков, исполнителей): 1 - открытый конкурс (устарело); 2 - конкурс с ограниченным участием (устарело); 3 - двухэтапный конкурс (устарело); 4 - закрытый конкурс (устарело); 5 - закрытый конкурс с ограниченным участием (устарело); 6 - закрытый двухэтапный конкурс (устарело); 7 - открытый аукцион в электронной форме (устарело); 8 - закрытый аукцион (устарело); 9 -... |
| `zfcs_contract.regNum2015Type` | IntegrationTypes.xsd | Номер реестровой записи государственного или муниципального контракта с 01.01.2015 |
| `zfcs_contract.regNumIKU2015Type` | IntegrationTypes.xsd | Номер реестровой записи государственного или муниципального контракта на основе ИКУ |
| `zfcs_contract.regNumType` | IntegrationTypes.xsd | Номер реестровой записи государственного или муниципального контракта |
| `zfcs_contract2015.notOOSPlacingType` | IntegrationTypes.xsd | Способ определения поставщиков (подрядчиков, исполнителей) для закупок, не размещаемых на ЕИС, в сведениях о контракте с 01.01.2015 11042 - закрытый конкурс; 11052 - закрытый конкурс с ограниченным участием; 11062 - закрытый двухэтапный конкурс; 12022 - закрытый аукцион; 20000 - закупка у единственного поставщика (подрядчика, исполнителя) (Используется ТОЛЬКО в печатных формах); 30000 - способ опр... |
| `zfcs_contract2015.purchasePlacing94Type` | IntegrationTypes.xsd | Способ размещения заказа 94-ФЗ для сведений о контракте с 01.01.2015: 1 - открытый конкурс (устарело); 2 - открытый аукцион (устарело); 3 - открытый аукцион в электронной форме (устарело); 4 - запрос котировок (устарело); 5 - результат рассмотрения и оценки котировочных заявок (Глава 5 Федерального закона №94-ФЗ) (устарело); 6 - единственный поставщик (устарело); 11011 - открытый конкурс; 11021 - ... |
| `zfcs_contract2015.purchasePlacingType` | IntegrationTypes.xsd | Способ определения поставщиков (подрядчиков, исполнителей) для закупок, размещаемых в ЕИС, в сведениях о контракте с 01.01.2015 11011 - открытый конкурс; 11021 - конкурс с ограниченным участием; 11031 - двухэтапный конкурс; 12011 - электронный аукцион; 13011 - запрос котировок; 14011 - запрос предложений; 11013 - открытый конкурс в электронной форме; 11023 - конкурс с ограниченным участием в элект... |
| `zfcs_contract2015Address2000Type` | IntegrationTypes.xsd | Тип: Адрес поставщика в сведениях о контракте (2000 знаков) |
| `zfcs_contract2015AddressType` | IntegrationTypes.xsd | Тип: Адрес поставщика в сведениях о контракте |
| `zfcs_contract2015ContractPriceSpecifyType` | IntegrationTypes.xsd | Тип: Способ указания цены договора: CP - цена договора ACP - ориентировочное значение цены договора или формула цены договора MCP - максимальное значение цены договора |
| `zfcs_contract2015DrugDictCodeType` | IntegrationTypes.xsd | Тип: Код в справочнике для справочников лекарственных препаратов |
| `zfcs_contract2015DrugExternalCodeType` | IntegrationTypes.xsd | Тип: Уникальный код в справочнике "Лекарственные препараты" |
| `zfcs_contract2015PenaltyType` | IntegrationTypes.xsd | Тип штрафа/пени в исполнении контракта с 01.01.2015 |
| `zfcs_contractModificationType` | IntegrationTypes.xsd | Тип изменения контракта |
| `zfcs_contractPenaltyType` | IntegrationTypes.xsd | Тип штрафа/пени в исполнении контракта |
| `zfcs_contractReqCodeType` | IntegrationTypes.xsd | Тип: Код реквизита контракта |
| `zfcs_contractReqNameType` | IntegrationTypes.xsd | Тип: Наименование реквизита контракта |
| `zfcs_control99ConfirmationResultType` | IntegrationTypes.xsd | Тип: Результат приема документа контроля по 99 статье |
| `zfcs_control99ContractDocTypeType` | IntegrationTypes.xsd | Тип: Тип прикрепленного документа в выжимке контракта для контроля по 99 статье: scanDoc - Копия заключенного контракта; modificationDoc - Копия документа, подтверждающая изменение контракта; singleSupplierDoc - Копия документа о согласовании заключения контракта с единственным поставщиком; medicalDoc - Решение врачебной комиссии; executionDoc - Документ о приемке; payDoc - Документ об оплате; oth... |
| `zfcs_control99DocNumberType` | IntegrationTypes.xsd | Тип: Номер документа для контроля по 99 статье |
| `zfcs_control99HeadNameType` | IntegrationTypes.xsd | Тип: ФИО руководителя согласно СвР |
| `zfcs_control99HeadPositionType` | IntegrationTypes.xsd | Тип: Должность руководителя согласно СвР |
| `zfcs_control99PersonalAccountType` | IntegrationTypes.xsd | Тип: Лицевой счет для контроля по 99 статье |
| `zfcs_control99ProtocolTypeType` | IntegrationTypes.xsd | Тип: Тип протокола ОППИ для контроля по 99 статье: fcsProtocolOK2 - Протокол рассмотрения и оценки заявок на участие в открытом конкурсе; fcsProtocolOKSingleApp - Протокол рассмотрения единственной заявки на участие в открытом конкурсе; fcsProtocolOKOU3 - Протокол рассмотрения и оценки заявок на участие в конкурсе с ограниченным участием; fcsProtocolOKOUSingleApp - Протокол рассмотрения единственн... |
| `zfcs_control99RiskLevelType` | IntegrationTypes.xsd | Тип: Уровень риска в универсальной выжимке, направляемой на контроль в орган контроля |
| `zfcs_control99UnRespRoleType` | IntegrationTypes.xsd | Тип: Роль организации в универсальной выжимке. CU - Заказчик; OCU - Заказчик в качестве организатора совместного аукциона; RA - Уполномоченный орган; ORA- Уполномоченный орган в качестве организатора совместного конкурса (аукциона) согласно ст. 25 №44ФЗ; AI - Уполномоченное учреждение; OAI- Уполномоченное учреждение в качестве организатора совместного конкурса (аукциона) согласно ст. 25 №44ФЗ; OA ... |
| `zfcs_control99UrlType` | IntegrationTypes.xsd | Тип: Тип ссылки в универсальной выжимке, направляемой на контроль в орган контроля Допустимые значения: printFormLink - ссылка на печатную форму документа; viewFormLink - ссылка на карточку документа; attachLink - ссылка на карточку документа. |
| `zfcs_controlRegistersDocNumberType` | IntegrationTypes.xsd | Номер документа в реестровой записи контрольного реестра (согласно ПП РФ №1148) |
| `zfcs_controlRegistersPlanRegNumberType` | IntegrationTypes.xsd | Номер проверки в составе плана проверок (согласно ПП РФ №1148) |
| `zfcs_controlRegistersPrescriptionExecutionType` | IntegrationTypes.xsd | Тип: Информация об исполнении предписания для контрольных реестров |
| `zfcs_controlRegistersRegNumberType` | IntegrationTypes.xsd | Номер реестровой записи контрольного реестра (согласно ПП РФ №1148) |
| `zfcs_countryFromTypeEnum` | IntegrationTypes.xsd | Тип: Тип страны происхождения товара. Допустимые значения: 1 - только страны ЕАЭС; 2 – страны ЕАЭС и остальные страны |
| `zfcs_criterionCodeEnum` | IntegrationTypes.xsd | Критерии оценки заявок участников: CP - Цена контракта. MC - Расходы на эксплуатацию и ремонт товаров, использование результатов работ. TC - Стоимость жизненного цикла товара или созданного в результате выполнения работы объекта. EN - Предложение о сумме соответствующих расходов заказчика, которые заказчик осуществит или понесет по энергосервисному контракту. QF - Качественные, функциональные и эк... |
| `zfcs_customerReportContractTerminationReasonEnum` | IntegrationTypes.xsd | Код причины расторжения контракта в ОЗ. Допустимые значения: 01 – по соглашению сторон; 02 – по решению суда; 03 – односторонний отказ заказчика от исполнения контракта; 04 – односторонний отказ исполнителя от исполнения контракта. |
| `zfcs_customerReportContractTypeEnum` | IntegrationTypes.xsd | Тип контракта в ОЗ Допустимые значения: SMP - Контракты, заключенные с субъектами малого предпринимательства, социально ориентированными некоммерческими организациями; CON - Контракты, содержащие условие о привлечении к исполнению контрактов субподрядчиков, соисполнителей из числа субъектов малого предпринимательства, социально ориентированных некоммерческих организаций; S30 - Контракты, заключенн... |
| `zfcs_customerReportFinanceSourceTypeEnum` | IntegrationTypes.xsd | Источники финансирования контракта в ОЗ. Допустимые значения: 01 – федеральный бюджет; 02 – бюджет субъекта Российской Федерации; 03 – бюджет муниципального образования; 04 – бюджет государственного внебюджетного фонда; 05 – внебюджетные и иные источники финансового обеспечения. |
| `zfcs_customerReportSupplierStatusEnum` | IntegrationTypes.xsd | Статус поставщика (подрядчика, исполнителя) в ОЗ. Допустимые значения: 1 – субъект малого предпринимательства; 2 – социально ориентированная некоммерческая организация; 3 – учреждение уголовно-исправительной системы; 4 – общероссийская общественная организация инвалидов. |
| `zfcs_customerReportTypeEnum` | fcsPrintForm.xsd | Тип отчета заказчиков: 1 - Отчет об объеме закупок у субъектов малого предпринимательства, социально ориентированных некоммерческих организаций; 2 - Отчет об исполнении контракта (результатах отдельного этапа исполнения контракта). |
| `zfcs_documentComplianceEnum` | IntegrationTypes.xsd | Варианты присутствия информации и документации в конкурсной заявке: A - присутствует, U - отсутствует, O - иное. |
| `zfcs_documentNumberType` | IntegrationTypes.xsd | Номер документа |
| `zfcs_documentType70ArticleType` | IntegrationTypes.xsd | Тип документа, принимаемый в ContractSign по ст. 70: CPWOS - Проект контракта без подписей, направляемый победителю аукциона; PDWWS - Протокол разногласий с подписью победителя аукциона; RRWCS - Документ с причинами отказа учета замечаний в протоколе разногласий с подписью заказчика и (или) Проект контракта, направляемый победителю аукциона CPWWS - Проект контракта с подписью победителя аукциона E... |
| `zfcs_etpActionStatusType` | IntegrationTypes.xsd | Виды блокировки выполнения операций на ЭП |
| `zfcs_etpActionType` | IntegrationTypes.xsd | Виды операций на ЭП: PRP - Размещение результатов рассмотрения первых частей заявок по электронному аукциону 44ФЗ; PR1 - Размещение протокола подведения итогов по электронному аукциону 44ФЗ; PR2- Размещение протокола отказа от заключения контракта; PR3 - Подписание государственного (муниципального) контракта; PR4 - Направление проекта контракта участнику размещения заказа; PR5 - Размещение протоко... |
| `zfcs_etpPrivilegeCodeType` | IntegrationTypes.xsd | Тип: Код привилегии пользователя на ЭП |
| `zfcs_etpPrivilegeNameType` | IntegrationTypes.xsd | Тип: Наименование привилегии пользователя на ЭП |
| `zfcs_eventResultPrescriptionTypeType` | IntegrationTypes.xsd | Тип: Тип документа, выданного в результате проведения контрольного мероприятия. Возможные значения: prescription – Предписание; submission – Представление. |
| `zfcs_eventSuspensionActionType` | IntegrationTypes.xsd | Тип: Вид приостановления/возобновления контрольного мероприятия |
| `zfcs_eventType` | IntegrationTypes.xsd | Вид планового контрольного мероприятия: PP-Плановая проверка; PR-Плановая ревизия; PO–Плановое обследование |
| `zfcs_excludedInfoTypeType` | IntegrationTypes.xsd | Тип: Тип исключаемых сведений: 01 - Информация о запросе цен товаров, работ, услуг; 02 - Информация о извещении об осуществлении закупки; 03 - Информация о правилах нормирования в сфере закупок; 04 - Сведения об обязательном общественном обсуждении; 05 - Информация о независимой гарантии; 06 - Информация о контракте; 07 - Информация об отчете заказчика; 08 - Сведения типового контракта, типовых ус... |
| `zfcs_fundsBudgetLevelContract2015Type` | IntegrationTypes.xsd | Уровень бюджета фондов для контрактов с 01.01.2015: 41 - бюджет Пенсионного фонда Российской Федерации; 42 - бюджет Фонда социального страхования Российской Федерации; 43 - бюджет Федерального фонда обязательного медицинского страхования; 50 - бюджет территориального государственного внебюджетного фонда |
| `zfcs_identificationOrganizationCodeType` | IntegrationTypes.xsd | Идентификационный код организации (ИКО/ИКЮЛ) |
| `zfcs_improperIndicatorNameEnum` | IntegrationTypes.xsd | Наименования показателей ненадлежащего исполнения контракта в ОЗ. Допустимые значения: Ro1 - Ненадлежащее исполнение и (или) неисполнение заказчиком обязательств, предусмотренных контрактом, за исключением нарушения сроков исполнения обязательств Ro2 - Нарушение заказчиком сроков исполнения обязательств Ro3 - Ненадлежащее исполнение и (или) неисполнение исполнителем обязательств, за исключением на... |
| `zfcs_improperIndicatorTypeEnum` | IntegrationTypes.xsd | Код показателя в ОЗ. Допустимые значения: Ro1 - Ненадлежащее исполнение и (или) неисполнение заказчиком обязательств, предусмотренных контрактом, за исключением нарушения сроков исполнения обязательств Ro2 - Нарушение заказчиком сроков исполнения обязательств Ro3 - Ненадлежащее исполнение и (или) неисполнение исполнителем обязательств, за исключением нарушений сроков исполнения обязательств, преду... |
| `zfcs_innAnalogType` | IntegrationTypes.xsd | ИНН или аналог |
| `zfcs_inspectionKOTypeType` | IntegrationTypes.xsd | Вид внеплановой проверки для документов KO: V-Выездная проверка; K-Документарная (камеральная) проверка |
| `zfcs_inspectionTypeType` | IntegrationTypes.xsd | Вид плановой, внеплановой проверки для документов ОВК: V-Выездная проверка; K-Камеральная проверка; VV–Встречная проверка в рамках выездной проверки; VK–Встречная проверка в рамках камеральной проверки |
| `zfcs_juristicKindCodeType` | IntegrationTypes.xsd | Код вида юридического лица |
| `zfcs_kladrTextType` | IntegrationTypes.xsd | Текстовое обозначение в КЛАДР |
| `zfcs_kosguType` | IntegrationTypes.xsd | КОСГУ |
| `zfcs_KTRPositionExternalCodeType` | IntegrationTypes.xsd | Тип КТРУ: Внешний код позиции КТРУ |
| `zfcs_KTRUAttachmentBusinessType` | IntegrationTypes.xsd | Тип КТРУ: Бизнес-тип прикрепляемого документа: (D – документ; O – документ-основание; A – документ- основание аннулирования; S – документ-стандарт) |
| `zfcs_KTRUCharacteristicChoiceTypeType` | IntegrationTypes.xsd | Тип КТРУ: Тип выбора значений характеристики позиции КТРУ: 1 - единственный выбор; 2 - множественный выбор; 3 - неизменяемый. |
| `zfcs_KTRUItemKindType` | IntegrationTypes.xsd | Тип КТРУ: Тип позиции КТРУ: 1 - товар, 2 - работа, 3 - услуга |
| `zfcs_KTRUPositionExternalCodeType` | IntegrationTypes.xsd | Внешний код позиции |
| `zfcs_KTRUShortNameType` | IntegrationTypes.xsd | Тип КТРУ: Короткая строка |
| `zfcs_KTRUStandartDocKindType` | IntegrationTypes.xsd | Тип КТРУ: Вид документа: 1 – Национальный стандарт; 2 – Межгосударственный стандарт; 3 – Стандарт организации (техническое условие); 4 – Свод правил; 5 – Технический регламент; 6 - Прочее. |
| `zfcs_KVRCodeType` | IntegrationTypes.xsd | Код вида расходов (справочник КВР) |
| `zfcs_longText4000MinType` | IntegrationTypes.xsd | Текстовое поле размерности 4000 с ограничением минимального значения |
| `zfcs_longTextMinType` | IntegrationTypes.xsd | Длинное текстовое поле с ограничением минимального значения |
| `zfcs_longTextType` | IntegrationTypes.xsd | Длинное текстовое поле |
| `zfcs_manufacturerReportRegType` | IntegrationTypes.xsd | Тип: Номер реестровой записи отчета |
| `zfcs_manufacturerReportRoleType` | IntegrationTypes.xsd | Роль организации: CU - Производитель товаров в соответствии со специальным инвестиционным контрактом в соответствии со статьей 111.3 Федерального закона N 44-ФЗ |
| `zfcs_modification.initiativeType` | IntegrationTypes.xsd | Инициатива проведения изменений |
| `zfcs_notificationChangeEnumType` | IntegrationTypes.xsd | Основаниe для изменения организации, размещающей заказ |
| `zfcs_notificationExceptionNumberType` | IntegrationTypes.xsd | Тип: Реестровый номер уведомления об исключении |
| `zfcs_notificationNumberType94` | IntegrationTypes.xsd | Реестровый номер извещения ЕИС |
| `zfcs_nsiBusinessControlActionEnum` | IntegrationTypes.xsd | Действия для бизнес-контролей |
| `zfcs_nsiBusinessControlDocumentEnum` | IntegrationTypes.xsd | Документы для бизнес-контролей |
| `zfcs_nsiBusinessControlLevelEnum` | IntegrationTypes.xsd | Уровни для бизнес-контролей |
| `zfcs_nsiBusinessControlSubSystemEnum` | IntegrationTypes.xsd | Подсистемы для бизнес-контролей |
| `zfcs_nsiContractExecutionDocCodeType` | IntegrationTypes.xsd | Код типа документа исполнения контракта |
| `zfcs_nsiContractExecutionDocNameType` | IntegrationTypes.xsd | Наименование типа документа исполнения контракта |
| `zfcs_nsiContractModificationReasonCodeType` | IntegrationTypes.xsd | Код причины изменения условий контракта |
| `zfcs_nsiContractModificationReasonDocCodeType` | IntegrationTypes.xsd | Код документа,являющегося основанием изменения контракта |
| `zfcs_nsiContractModificationReasonDocNameType` | IntegrationTypes.xsd | Наименование документа,являющегося основанием изменения контракта |
| `zfcs_nsiContractModificationReasonNameType` | IntegrationTypes.xsd | Наименование причины изменения условий контракта |
| `zfcs_nsiContractPenaltyReasonCodeType` | IntegrationTypes.xsd | Код причины начисления неустойки |
| `zfcs_nsiContractPenaltyReasonNameType` | IntegrationTypes.xsd | Наименование причины начисления неустойки |
| `zfcs_nsiContractReparationDocCodeType` | IntegrationTypes.xsd | Код документа, являющиеся основанием для начисления суммы возмещения фактически понесенного ущерба |
| `zfcs_nsiContractReparationDocNameType` | IntegrationTypes.xsd | Наименование документа, являющиеся основанием для начисления суммы возмещения фактически понесенного ущерба |
| `zfcs_nsiContractTerminationReasonCodeType` | IntegrationTypes.xsd | Код основания расторжения контракта |
| `zfcs_nsiContractTerminationReasonDocCodeType` | IntegrationTypes.xsd | Код документа, являющегося основанием расторжения контракта |
| `zfcs_nsiContractTerminationReasonDocNameType` | IntegrationTypes.xsd | Наименование документа, являющегося основанием расторжения контракта |
| `zfcs_nsiContractTerminationReasonNameType` | IntegrationTypes.xsd | Наименование основания расторжения контракта |
| `zfcs_nsiFarmDrugDecimalCodeType` | IntegrationTypes.xsd | Тип: Decimal для справочника "Лекарственные препараты" |
| `zfcs_nsiFarmDrugDictCodeType` | IntegrationTypes.xsd | Тип: Бизнес-код для справочника "Лекарственные препараты" |
| `zfcs_nsiFarmDrugPriceTypeEnum` | IntegrationTypes.xsd | Тип референтной цены по справочнику "Референтные цены по МНН": 1 - рассчитана по Методике с использованием исторических данных; 2 - рассчитана по Методике с использованием исторических данных и последующей ручной корректировкой; 3 - задана путем проведения переговоров; 4 - референтная цена, рассчитаная по Методике с использованием исторических данных и сведений о взаимозаменяемости после 01.01.201... |
| `zfcs_nsiReestrNumberType` | IntegrationTypes.xsd | Уникальный номер записи |
| `zfcs_nsiSingleCustomerReasonCodeType` | IntegrationTypes.xsd | Код основания заключения контракта с единственным поставщиком |
| `zfcs_nsiSingleCustomerReasonDocCodeType` | IntegrationTypes.xsd | Код документа, подтверждающего основание заключения контракта с единственным поставщиком |
| `zfcs_nsiSingleCustomerReasonDocNameType` | IntegrationTypes.xsd | Наименование документа, подтверждающего основание заключения контракта с единственным поставщиком |
| `zfcs_nsiSingleCustomerReasonNameType` | IntegrationTypes.xsd | Наименование основания заключения контракта с единственным поставщиком |
| `zfcs_okpoType` | IntegrationTypes.xsd | ОКПО |
| `zfcs_organizationLinkBlockStatusType` | IntegrationTypes.xsd | Вид блокировки связи организаций |
| `zfcs_organizationLinkOrdersVisibilityType` | IntegrationTypes.xsd | Область доступа к осуществляемым закупкам: A - Активно; B - Заблокировано. |
| `zfcs_organizationRoleType` | IntegrationTypes.xsd | Полномочия организации: CU - Заказчик; RA - Уполномоченный орган; AI - Уполномоченное учреждение; SO - Специализированная организация, осуществляющая закупки в соответствии с Федеральным законом № 44-ФЗ и (или) Постановлением № 615; CO - Контрольный орган в сфере закупок; SP - Юридическое лицо, оказывающее услуги по обслуживанию пользователей единой информационной системы; FO - Финансовый орган; E... |
| `zfcs_orgLinkOrdersVisibilityTypeEnum` | IntegrationTypes.xsd | Вид блокировки просмотра закупок связанной орагнизации |
| `zfcs_participantStatusContract2015Type` | IntegrationTypes.xsd | Статус поставщика для контрактов с 01.01.2015: 10 - учреждение и предприятие уголовно-исполнительной системы; 20 - организация инвалидов; 30 - субъект малого предпринимательства; 31 - поставщик (подрядчик, исполнитель), который в соответствии с контрактом обязан привлечь к исполнению контракта субподрядчиков, соисполнителей из числа субъектов малого предпринимательства; 40 - социально-ориентирован... |
| `zfcs_participantTypeEnum` | IntegrationTypes.xsd | Виды поставщика |
| `zfcs_penaltyChangeTypeEnum` | IntegrationTypes.xsd | Вид изменения штрафа/пени |
| `zfcs_personalAccountType` | IntegrationTypes.xsd | Тип: Номер лицевого счета |
| `zfcs_placementOrgRoleType` | IntegrationTypes.xsd | Тип: Полномочие организации, осуществившей размещение сведений об исключении: CU - Заказчик; RA - Уполномоченный орган; AI - Уполномоченное учреждение; SO - Специализированная организация, осуществляющая закупки в соответствии с Федеральным законом № 44-ФЗ и (или) Постановлением № 615; CO - Контрольный орган в сфере закупок; ICB - Орган внутреннего государственного (муниципального) финансового кон... |
| `zfcs_placementResultEnum` | IntegrationTypes.xsd | Результат определения поставщика: CC - Заключение контракта; RC - Отказ или уклонение от заключения контракта |
| `zfcs_placerRoleContract2015Type` | IntegrationTypes.xsd | Роль организации, разместившей контракт: CU - Заказчик; RA - Уполномоченный орган; AI - Уполномоченное учреждение; OA - Организация, осуществляющая полномочия заказчика на основании соглашения в соответствии с частью 6 статьи 15 Федерального закона № 44-ФЗ; CS - Организация, осуществляющая закупки в соответствии с частью 5 статьи 15 Федерального закона № 44-ФЗ; CN - Организация, осуществляющая зак... |
| `zfcs_placingWayTypeEnum` | IntegrationTypes.xsd | Типы способов размещения заказа (определения поставщика): FZ94 - закон 94ФЗ; FZ44 - закон 44ФЗ; PP615 - ПП РФ 615. |
| `zfcs_preferenceTypeEnum` | IntegrationTypes.xsd | Виды преференций: P - преимущество; А - требование; C - ограничение; D - дополнительное требование. |
| `zfcs_protocolPartTypeEnum` | IntegrationTypes.xsd | Вид приложений протокола, являющихся его неотъемлемой частью: C - Условия исполнения контракта, указанные в заявках на участие в определении поставщика, O - Предложения участников в электронной форме, M - Порядок оценки заявок в электронной форме. |
| `zfcs_publicDiscussionFormNumberType` | IntegrationTypes.xsd | Номер анкеты ООКЗ |
| `zfcs_publicDiscussionLargePurchaseStagesEnum` | IntegrationTypes.xsd | Этапы общественных обсуждений крупных закупок: Возможные значения: S1 - Этап 1 S2 - Этап 2 |
| `zfcs_publicDiscussionLevelEnum` | fcsPrintForm.xsd | Общественное обсуждение проводится в соответствии с нормативным правовым актом уровня: R - Субъекта РФ; M - Муниципального образования. |
| `zfcs_publicDiscussionLevelEnum` | IntegrationTypes.xsd | Общественное обсуждение проводится в соответствии с нормативным правовым актом уровня: R - Субъекта РФ; M - Муниципального образования. |
| `zfcs_publicDiscussionProtocolNumType` | IntegrationTypes.xsd | Номер протокола ООКЗ |
| `zfcs_publicDiscussionrSuspensionActionType` | IntegrationTypes.xsd | Вид приостановления/возобновления ООКЗ |
| `zfcs_publicDiscussionStage` | IntegrationTypes.xsd | Этапы общественного обсуждения: 1 - Первый этап;2 - Второй этап |
| `zfcs_publicDiscussionStage2020TypeEnum` | IntegrationTypes.xsd | Этапы общественного обсуждения 2020: INP - Проводится; FIN - Завершено |
| `zfcs_publicDiscussionTypeEnum` | IntegrationTypes.xsd | Типы общественных обсуждений: LP - Общественное обсуждение крупных закупок; OT - иные. |
| `zfcs_purchasePlacingType` | IntegrationTypes.xsd | Способ определения поставщиков(подрядчиков, исполнителей) 1 - открытый конкурс; 2 - конкурс с ограниченным участием; 3 - двухэтапный конкурс; 4 - закрытый конкурс; 5 - закрытый конкурс с ограниченным участием; 6 - закрытый двухэтапный конкурс; 7 - аукцион в электронной форме; 8 - закрытый аукцион; 9 - запрос котировок; 10 - запрос предложений; 11 - закупка у единственного поставщика (подрядчика, и... |
| `zfcs_purchasePlanAgreementTypeCodeEnum` | IntegrationTypes.xsd | Код типа соглашения о предоставлении субсидии: CAPITAL - На капитальные вложения; OTHER - Иное. |
| `zfcs_purchasePlanBasementEnum` | IntegrationTypes.xsd | НПА, на основании которого составлен план закупок: PPF552 - Постановление правительства РФ №552 от 05.06.2015 (федеральное); PPF1043 - Постановление правительства РФ №1043 от PPF1043 (региональное и муниципальное). |
| `zfcs_purchasePlanModificationReasonEnum` | IntegrationTypes.xsd | Обоснования внесения изменений в позицию плана закупок: 1 - Изменение целей осуществления закупок, требований к закупаемым товарам, работам, услугам и (или) нормативных затрат; 2 - Внесение изменений в закон о бюджете на текущий финансовый год и плановый период; 3 - Реализация НПА, которые приняты (даны) после утверждения планов закупок и не приводят к изменению утвержденных ОБАС на текущий финанс... |
| `zfcs_purchasePlanNumberType` | IntegrationTypes.xsd | Реестровый номер плана закупок в структурированной форме |
| `zfcs_purchasePlanPeriodicityTypeEnum` | IntegrationTypes.xsd | Периодичность поставки товаров, выполнения работ, оказания услуг: W - еженедельно; B - два раза в месяц; M - ежемесячно; Q - ежеквартально; S - один раз в полгода; Y - один раз в год. |
| `zfcs_purchasePlanPositionModificationStatusEnum` | IntegrationTypes.xsd | Статус позиции при приеме изменений планов закупок: N - Данные позиции перенесены из предыдущей версии плана закупки без изменений; E - Данные позиции отредактированы; |
| `zfcs_purchasePlanPositonExtNumberType` | IntegrationTypes.xsd | Внешний номер позиции плана закупок (плана-графика) |
| `zfcs_purchasePlanPositonNumberType` | IntegrationTypes.xsd | Номер позиции плана закупок (плана-графика) |
| `zfcs_purchasePlanPurchaseNumberType` | IntegrationTypes.xsd | Номер закупки, включенной в план закупок |
| `zfcs_purchasePlanVersionOwnerRoleType` | IntegrationTypes.xsd | Роль организации-владельца версии плана закупок/плана-графика закупок CU - Заказчик; OA - Организация, осуществляющая полномочия заказчика на основании соглашения в соответствии с частью 6 статьи 15 Федерального закона № 44-ФЗ. |
| `zfcs_reasonsTypeEnum` | IntegrationTypes.xsd | Тип оснований признания процедуры несостоявшейся: OR - По окончании срока подачи заявок подана только одна заявка. Такая заявка признана соответствующей требованиям 44-ФЗ и требованиям, указанным в извещении; NR - По окончании срока подачи заявок не подано ни одной заявки; OV - По результатам рассмотрения заявок только одна заявка признана соответствующей требованиям ФЗ и требованиям, указанным в ... |
| `zfcs_registryNumType` | fcsPrintForm.xsd | Реестровый номер в ДИЗК |
| `zfcs_registryNumType` | IntegrationTypes.xsd | Реестровый номер в ДИЗК |
| `zfcs_regulationRulesBaseDocumentTypeEnum` | IntegrationTypes.xsd | Вид документа-основания для ПНЗ: 1 - Указ; 2 - Распоряжение; 3 - Постановление; 4 - Приказ; 5 - Письмо; 6 - Протокол; 7 - Иное. |
| `zfcs_regulationRulesCouncilDecisionEnum` | IntegrationTypes.xsd | Решение общественного совета: RE - Доработать проект правил нормирования; PA - Принять правила нормирования. |
| `zfcs_regulationRulesDocumentsEnum` | IntegrationTypes.xsd | Вид документа ПНЗ: Допустимые значения: 1 - проект правил нормирования; 2 - пояснительная записка к проекту правил нормирования; 3 - предложения общественных объединений, юридических и физических лиц (устарело, не применяется); 4 - ответы на предложения общественных объединений, юридических и физических лиц (устарело, не применяется); 5 - протокол решения, принятого общественным советом (устарело,... |
| `zfcs_regulationRulesNumberType` | IntegrationTypes.xsd | Реестровый номер правил нормирования |
| `zfcs_regulationRulesTypeEnum` | IntegrationTypes.xsd | Тип правил нормирования: 1. Общие правила нормирования в сфере закупок; 2. Общие требования к правовым актам по нормированию; 3. Общие правила определения требований к отдельным видам товаров, работ, услуг; 4. Общие правила определения нормативных затрат; 5. Правила нормирования в сфере закупок; 6. Требования к правовым актам по нормированию; 7. Требования к отдельным видам товаров, работ, услуг; ... |
| `zfcs_regulatoryLegalActInfoTypeEnum` | IntegrationTypes.xsd | Тип НМСИ: 1 - Сведения о порядке формирования планов-графиков в соответствии с постановлением Правительства РФ от 21.11.2013 № 1044; 2 - Сведения о порядке формирования планов-закупок в соответствии с постановлением Правительства РФ от 21.11.2013 № 1043; 3 - Сведения об условиях допуска товаров, работ, услуг, выполняемых или происходящих из иностранных государств; 4 - Сведения о перечне международ... |
| `zfcs_reportIdType` | fcsPrintForm.xsd | Номер отчета заказчика |
| `zfcs_reportIdType` | IntegrationTypes.xsd | Номер отчета заказчика |
| `zfcs_repRegNumber` | IntegrationTypes.xsd | Реестровый номер записи РЕП |
| `zfcs_repStatus` | IntegrationTypes.xsd | Статус записи в Реестре единственных поставщиков: A – Размещено; T – Расторгнуто; F – Завершено |
| `zfcs_responsibleRoleType` | IntegrationTypes.xsd | CU - Заказчик; OCU - Заказчик в качестве организатора совместного аукциона; RA - Уполномоченный орган; ORA- Уполномоченный орган в качестве организатора совместного конкурса (аукциона) согласно ст. 25 №44ФЗ; AI - Уполномоченное учреждение; OAI- Уполномоченное учреждение в качестве организатора совместного конкурса (аукциона) согласно ст. 25 №44ФЗ; OA - Организация, осуществляющая полномочия заказч... |
| `zfcs_revisionNumType` | fcsPrintForm.xsd | Номер редакции в ДИЗК |
| `zfcs_revisionNumType` | IntegrationTypes.xsd | Номер редакции в РДИ |
| `zfcs_rightSideKTRUAttachmentBusinessType` | IntegrationTypes.xsd | Тип КТРУ: Бизнес-тип прикрепляемого документа для правой части позиции КТРУ (D – документ; F – фото; TR - технический регламент или стандарт) |
| `zfcs_RMISNumType` | IntegrationTypes.xsd | Регистрационный номер РМИС |
| `zfcs_schemeVersionContractType` | IntegrationTypes.xsd | Версия схемы для РК до 2015 года |
| `zfcs_signIncomingRegNumberType` | IntegrationTypes.xsd | Реестровый номер для результата обработки |
| `zfcs_sketchPlanNumberType` | IntegrationTypes.xsd | Реестровый номер плана закупок в неструктурированной форме |
| `zfcs_standardContractTypeEnum` | IntegrationTypes.xsd | Вид документа БТК. Допустимые значения: С - типовой контракт, Т - типовые условия контракта. |
| `zfcs_subordinationTypeEnum` | IntegrationTypes.xsd | Виды подчиненности организаций |
| `zfcs_subsystemTypeDTEnum` | IntegrationTypes.xsd | Виды подсистем для неструктурированных документов |
| `zfcs_subsystemTypeEnum` | IntegrationTypes.xsd | Виды подсистем |
| `zfcs_subsystemTypePurchaseRejectReasonEnum` | IntegrationTypes.xsd | Виды подсистем для справочника причин отказа в допуске заявок |
| `zfcs_surveyType` | IntegrationTypes.xsd | Вид планового, внепланового обследования : OV-Обследование в рамках выездной проверки; OK-Обследование в рамках камеральной проверки; OR-обследование в рамках ревизии |
| `zfcs_svodReestrNumType` | IntegrationTypes.xsd | Код организации по Сводному реестру |
| `zfcs_tenderPlan.PurchasePlacingType` | IntegrationTypes.xsd | Способ определения поставщиков(подрядчиков, исполнителей) 1 - открытый конкурс; 2 - конкурс с ограниченным участием; 3 - двухэтапный конкурс; 4 - закрытый конкурс; 5 - закрытый конкурс с ограниченным участием; 6 - закрытый двухэтапный конкурс; 7 - аукцион в электронной форме; 8 - закрытый аукцион; 9 - запрос котировок; 10 - запрос предложений; 11 - закупка у единственного поставщика (подрядчика, и... |
| `zfcs_tenderPlan2017BankSupportContractType` | IntegrationTypes.xsd | Тип: Информация о банковском или казначейском сопровождении контракта: NOT_REQUIRED - банковское или казначейское сопровождение не требуется; BANK_SUPPORT - требуется банковское сопровождение контракта; TREASURE_SUPPORT - требуется казначейское сопровождение контракта; BANK TREASURE_SUPPORT - требуется банковское или казначейское сопровождение контракта, BANK_AND_TREASURE_SUPPORT - требуется банко... |
| `zfcs_tenderPlan2017BasementEnum` | IntegrationTypes.xsd | НПА, на основании которого составлен план-график с 01.01.2017: PPF553 - Постановление правительства РФ № 553 от 05.06.2015 (федеральное); PPF554 - Постановление правительства РФ № 554 от 05.06.2015 (региональное и муниципальное); PPF552 - Ошибочное значение, не применяется. Оставлено для обратной совместимости схем; PPF1043 - Ошибочное значение, не применяется. Оставлено для обратной совместимости... |
| `zfcs_tenderPlan2017FoundMethodsEnum` | IntegrationTypes.xsd | Методы определения и обоснования НМЦК: С - метод сопоставимых рыночных цен (анализа рынка); R - нормативный метод; T - тарифный метод; D - проектно-сметный метод; E - затратный метод; O871N - метод, установленный приказом Минздрава России от 26.10.2017 № 871н. |
| `zfcs_tenderPlan2017PeriodicityTypeEnum` | IntegrationTypes.xsd | Периодичность поставки товаров, выполнения работ, оказания услуг: D - ежедневно; W - еженедельно; B - два раза в месяц; M - ежемесячно; Q - ежеквартально; S - один раз в полгода; Y - один раз в год. |
| `zfcs_tenderPlan2017PositionModificationStatusEnum` | IntegrationTypes.xsd | Статус позиции при приеме изменений планов-графиков с 01.01.2017: N - Данные позиции перенесены из предыдущей версии плана закупки (плана-графика закупки) без изменений; E - Данные позиции отредактированы; EC - В данные позиции вносятся сведения об экономии. |
| `zfcs_tenderPlan2017PositionNumberType` | IntegrationTypes.xsd | Реестровый номер позиции (уникальный реестровый номер закупки) в плане-графике с 01.01.2017 |
| `zfcs_tenderPlan2017PurchaseNumberType` | IntegrationTypes.xsd | Номер закупки, включенной в план-график с 01.01.2017 |
| `zfcs_tenderPlanNumberType` | IntegrationTypes.xsd | Реестровый номер плана-графика |
| `zfcs_tenderPlanPositionNumberType` | IntegrationTypes.xsd | Реестровый номер позиции в плане-графике |
| `zfcs_tenderSuspensionActionType` | IntegrationTypes.xsd | Вид приостановки размещения закупки |
| `zfcs_TOFKCodeType` | IntegrationTypes.xsd | Код ТОФК |
| `zfcs_unplannedCheckNumberType` | IntegrationTypes.xsd | Номер реестровой записи внеплановой проверки, сформированный контрольным органом |
| `zfcs_urlType` | IntegrationTypes.xsd | Ссылка |
| `zfcs_userLinkBlockStatusType` | IntegrationTypes.xsd | Вид блокировки связи пользователя |
| `zfcs_userStatusType` | IntegrationTypes.xsd | Вид блокировки пользователя |
| `zfcs_valueType` | IntegrationTypes.xsd | Значимость критерия/показателя |
| `zfcs_violationLevelType` | IntegrationTypes.xsd | Тип нарушения в протоколе приема |
| `zfcs_volumeType` | IntegrationTypes.xsd | Объем средств в тыс. рублей |
| `zfcs_yearType` | IntegrationTypes.xsd | Номер года |

## element

| NAME | FILE | DESCRIPTION |
| --- | --- | --- |
| `ackRequest` | QueueVBS\queue-vbs-ws-api.xsd | Подтверждение получения сообщения |
| `ackRequest` | queue-ws-api.xsd | Подтверждение получения сообщения |
| `ackResponse` | QueueVBS\queue-vbs-ws-api.xsd | Ответ на подтверждение получения сообщения |
| `ackResponse` | queue-ws-api.xsd | Ответ на подтверждение получения сообщения |
| `approval` | fcsPrintForm.xsd | Обращение в контрольный орган |
| `approvalMismatch` | fcsPrintForm.xsd | Уведомление о выявленных в обращении несоответствиях |
| `approvalTransfer` | fcsPrintForm.xsd | Информация о передаче обращения в другой контрольный орган |
| `bankGuarantee` | fcsExtegration.xsd | Проект информация о выданной независимой гарантии; внесение изменений |
| `bankGuarantee` | fcsIntegration.xsd | Пакет данных: Информация о выданной независимой гарантии; внесение изменений |
| `bankGuarantee` | fcsPrintForm.xsd | Информация о выданной независимой гарантии; внесение изменений |
| `bankGuaranteeInvalid` | fcsExtegration.xsd | Проект информации о недействительности сведений о независимой гарантии |
| `bankGuaranteeInvalid` | fcsIntegration.xsd | Пакет данных:Информация о недействительности сведений о независимой гарантии |
| `bankGuaranteeInvalid` | fcsPrintForm.xsd | Информация о недействительности сведений о независимой гарантии |
| `bankGuaranteeOtherBankNotice` | fcsPrintForm.xsd | Уведомления о получении доступа к реестровым записям других гарантов (для печатной формы) |
| `bankGuaranteeRefusal` | fcsExtegration.xsd | Сведения об отказе заказчика в принятии независимой гарантии; внесение изменений |
| `bankGuaranteeRefusal` | fcsIntegration.xsd | Пакет данных: Сведения об отказе заказчика в принятии независимой гарантии; внесение изменений |
| `bankGuaranteeRefusal` | fcsPrintForm.xsd | Сведения об отказе заказчика в принятии независимой гарантии; внесение изменений |
| `bankGuaranteeRefusalInvalid` | fcsExtegration.xsd | Сведения о недействительности отказа заказчика в принятии независимой гарантии |
| `bankGuaranteeRefusalInvalid` | fcsIntegration.xsd | Пакет данных: Сведения о недействительности отказа заказчика в принятии независимой гарантии |
| `bankGuaranteeRefusalInvalid` | fcsPrintForm.xsd | Сведения о недействительности отказа заказчика в принятии независимой гарантии |
| `bankGuaranteeReturn` | fcsExtegration.xsd | Информация о возвращении независимой гарантии или об освобождении от обязательств по независимой гарантии; внесение изменений |
| `bankGuaranteeReturn` | fcsIntegration.xsd | Пакет данных: Информация о возвращении независимой гарантии или об освобождении от обязательств по независимой гарантии; внесение изменений |
| `bankGuaranteeReturn` | fcsPrintForm.xsd | Информация о возвращении независимой гарантии или об освобождении от обязательств по независимой гарантии; внесение изменений |
| `bankGuaranteeReturnInvalid` | fcsExtegration.xsd | Сведения о недействительности информации о возвращении независимой гарантии или об освобождении от обязательств по независимой гарантии |
| `bankGuaranteeReturnInvalid` | fcsIntegration.xsd | Пакет данных: Сведения о недействительности информации о возвращении независимой гарантии или об освобождении от обязательств по независимой гарантии |
| `bankGuaranteeReturnInvalid` | fcsPrintForm.xsd | Сведения о недействительности информации о возвращении независимой гарантии или об освобождении от обязательств по независимой гарантии |
| `bankGuaranteeTermination` | fcsExtegration.xsd | Информация о прекращении обязательств поставщика по независимой гарантии; внесение изменений |
| `bankGuaranteeTermination` | fcsIntegration.xsd | Пакет данных: Информация о прекращении обязательств поставщика по независимой гарантии; внесение изменений |
| `bankGuaranteeTermination` | fcsPrintForm.xsd | Информация о прекращении обязательств поставщика по независимой гарантии; внесение изменений |
| `bankGuaranteeTerminationInvalid` | fcsExtegration.xsd | Сведения о недействительности информации о прекращении обязательств поставщика по независимой гарантии |
| `bankGuaranteeTerminationInvalid` | fcsIntegration.xsd | Пакет данных: Сведения о недействительности информации о прекращении обязательств поставщика по независимой гарантии |
| `bankGuaranteeTerminationInvalid` | fcsPrintForm.xsd | Сведения о недействительности информации о прекращении обязательств поставщика по независимой гарантии |
| `baseFault` | eis-fs-ws-api.xsd | Пакет данных: Исключение: Базовое исключение |
| `ceClosedContractBankGuaranteeReturn` | fcsExtegration.xsd | Сведения об исполнении контракта о возвращении независимой гарантии гаранту или об уведомлении, направляемом заказчиком гаранту, об отказе от прав по гарантии (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractBankGuaranteeReturn` | fcsIntegration.xsd | Пакет данных:Сведения об исполнении контракта о возвращении независимой гарантии гаранту или об уведомлении, направляемом заказчиком гаранту, об отказе от прав по гарантии (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractBankGuaranteeReturn` | fcsPrintForm.xsd | Сведения об исполнении контракта о возвращении независимой гарантии гаранту или об уведомлении, направляемом заказчиком гаранту, об отказе от прав по гарантии (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractBankGuaranteeReturnInvalid` | fcsExtegration.xsd | Сведения об исполнении контракта о недействительности информации о возвращении независимой гарантии или об уведомлении, направляемом заказчиком гаранту, об отказе от прав по гарантии (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractBankGuaranteeReturnInvalid` | fcsIntegration.xsd | Пакет данных:Сведения об исполнении контракта о недействительности информации о возвращении независимой гарантии или об уведомлении, направляемом заказчиком гаранту, об отказе от прав по гарантии (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractBankGuaranteeReturnInvalid` | fcsPrintForm.xsd | Сведения об исполнении контракта о недействительности информации о возвращении независимой гарантии или об уведомлении, направляемом заказчиком гаранту, об отказе от прав по гарантии (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractBankGuaranteeTermination` | fcsExtegration.xsd | Сведения об исполнении контракта по прекращению обязательств поставщика по независимой гарантии (ЦРК) (большая закупка) |
| `ceClosedContractBankGuaranteeTermination` | fcsIntegration.xsd | Пакет данных:Сведения об исполнении контракта по прекращению обязательств поставщика по независимой гарантии (ЦРК) (большая закупка) |
| `ceClosedContractBankGuaranteeTermination` | fcsPrintForm.xsd | Сведения об исполнении контракта по прекращению обязательств поставщика по независимой гарантии (ЦРК) (большая закупка) |
| `ceClosedContractBankGuaranteeTerminationInvalid` | fcsExtegration.xsd | Сведения об исполнении контракта о недействительности информации о прекращении обязательств поставщика по независимой гарантии (ЦРК) (большая закупка) |
| `ceClosedContractBankGuaranteeTerminationInvalid` | fcsIntegration.xsd | Пакет данных:Сведения об исполнении контракта о недействительности информации о прекращении обязательств поставщика по независимой гарантии (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractBankGuaranteeTerminationInvalid` | fcsPrintForm.xsd | Сведения об исполнении контракта о недействительности информации о прекращении обязательств поставщика по независимой гарантии (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionCancel` | fcsExtegration.xsd | Отмена сведений об исполнении контракта (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionCancel` | fcsIntegration.xsd | Пакет данных:Отмена сведений об исполнении контракта (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionCancel` | fcsPrintForm.xsd | Отмена сведений об исполнении контракта (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionCancelFailure` | fcsExtegration.xsd | Отмена информации об отмене сведений об исполнении (расторжении) контракта (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionCancelFailure` | fcsIntegration.xsd | Пакет данных:Отмена информации об отмене сведений об исполнении (расторжении) контракта (ЦРК) (большая закупка) |
| `ceClosedContractExecutionCancelFailure` | fcsPrintForm.xsd | Отмена информации об отмене сведений об исполнении (расторжении) контракта (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionDocAcceptance` | fcsExtegration.xsd | Сведения об исполнении контракта по документу о приемке (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionDocAcceptance` | fcsIntegration.xsd | Пакет данных:Сведения об исполнении контракта по документу о приемке (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionDocAcceptance` | fcsPrintForm.xsd | Сведения об исполнении контракта по документу о приемке (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionObligationGuarantee` | fcsExtegration.xsd | Сведения о наступлении гарантийного случая или исполнении гарантийных обязательств (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionObligationGuarantee` | fcsIntegration.xsd | Пакет данных:Сведения об исполнении контракта по документу о приемке (ЦРК) (большая закупка) |
| `ceClosedContractExecutionObligationGuarantee` | fcsPrintForm.xsd | Сведения о наступлении гарантийного случая или исполнении гарантийных обязательств (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionOther` | fcsExtegration.xsd | Иные сведения об исполнении контракта (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionOther` | fcsIntegration.xsd | Пакет данных:Иные сведения об исполнении контракта (ЦРК)(непубличные данные) |
| `ceClosedContractExecutionOther` | fcsPrintForm.xsd | Иные сведения об исполнении контракта (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionPayment` | fcsExtegration.xsd | Сведения об оплате (возврате оплаты) (ЦРК) (большая закупка) |
| `ceClosedContractExecutionPayment` | fcsIntegration.xsd | Пакет данных:Сведения об оплате (возврате оплаты) (ЦРК) (большая закупка) |
| `ceClosedContractExecutionPayment` | fcsPrintForm.xsd | Сведения об оплате (возврате оплаты) (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionPenaltyAccrual` | fcsExtegration.xsd | Сведения о начислении неустойки (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionPenaltyAccrual` | fcsIntegration.xsd | Пакет данных:Сведения о начислении неустойки (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionPenaltyAccrual` | fcsPrintForm.xsd | Сведения о начислении неустойки (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionPenaltyHolding` | fcsExtegration.xsd | Сведения об удержании неустойки (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionPenaltyHolding` | fcsIntegration.xsd | Пакет данных:Сведения об удержании неустойки (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionPenaltyHolding` | fcsPrintForm.xsd | Сведения об удержании неустойки (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionPenaltyWriteOff` | fcsExtegration.xsd | Сведения о списании неустойки (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionPenaltyWriteOff` | fcsIntegration.xsd | Пакет данных:Сведения о списании неустойки (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractExecutionPenaltyWriteOff` | fcsPrintForm.xsd | Сведения о списании неустойки (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractTerminationUnilateralRefusal` | fcsExtegration.xsd | Сведения об одностороннем расторжении контракта (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractTerminationUnilateralRefusal` | fcsIntegration.xsd | Пакет данных:Сведения об одностороннем расторжении контракта (ЦРК) (большая закупка) (непубличные данные) |
| `ceClosedContractTerminationUnilateralRefusal` | fcsPrintForm.xsd | Сведения об одностороннем расторжении контракта (ЦРК) (большая закупка) (непубличные данные) |
| `ceContractExecutionCancel` | fcsExtegration.xsd | Отмена сведений об исполнении контракта (ЦРК) (большая закупка) |
| `ceContractExecutionCancel` | fcsIntegration.xsd | Пакет данных:Отмена сведений об исполнении контракта (ЦРК) (большая закупка) |
| `ceContractExecutionCancel` | fcsPrintForm.xsd | Отмена сведений об исполнении контракта (ЦРК) (большая закупка) |
| `ceContractExecutionCancelFailure` | fcsExtegration.xsd | Отмена информации об отмене сведений об исполнении (расторжении) контракта (ЦРК) (большая закупка) |
| `ceContractExecutionCancelFailure` | fcsIntegration.xsd | Пакет данных:Отмена информации об отмене сведений об исполнении (расторжении) контракта (ЦРК) (большая закупка) |
| `ceContractExecutionCancelFailure` | fcsPrintForm.xsd | Отмена информации об отмене сведений об исполнении (расторжении) контракта (ЦРК) (большая закупка) |
| `ceContractExecutionDocAcceptance` | fcsExtegration.xsd | Сведения об исполнении контракта по документу о приемке (ЦРК) (большая закупка) |
| `ceContractExecutionDocAcceptance` | fcsIntegration.xsd | Пакет данных:Сведения об исполнении контракта по документу о приемке (ЦРК) (большая закупка)) |
| `ceContractExecutionDocAcceptance` | fcsPrintForm.xsd | Сведения об исполнении контракта по документу о приемке (ЦРК) (большая закупка) |
| `ceContractExecutionObligationGuarantee` | fcsExtegration.xsd | Сведения о наступлении гарантийного случая или исполнении гарантийных обязательств (ЦРК) (большая закупка) |
| `ceContractExecutionObligationGuarantee` | fcsIntegration.xsd | Пакет данных:Сведения об исполнении контракта по документу о приемке (ЦРК) (большая закупка) |
| `ceContractExecutionObligationGuarantee` | fcsPrintForm.xsd | Сведения о наступлении гарантийного случая или исполнении гарантийных обязательств (ЦРК) (большая закупка) |
| `ceContractExecutionOther` | fcsExtegration.xsd | Иные сведения об исполнении контракта (ЦРК) (большая закупка) |
| `ceContractExecutionOther` | fcsIntegration.xsd | Пакет данных:Иные сведения об исполнении контракта (ЦРК) |
| `ceContractExecutionOther` | fcsPrintForm.xsd | Иные сведения об исполнении контракта (ЦРК) (большая закупка) |
| `ceContractExecutionPayment` | fcsExtegration.xsd | Сведения об оплате (возврате оплаты) (ЦРК) (большая закупка) |
| `ceContractExecutionPayment` | fcsIntegration.xsd | Пакет данных:Сведения об оплате (возврате оплаты) (ЦРК) (большая закупка) |
| `ceContractExecutionPayment` | fcsPrintForm.xsd | Сведения об оплате (возврате оплаты) (ЦРК) (большая закупка) |
| `ceContractExecutionPenaltyAccrual` | fcsExtegration.xsd | Сведения о начислении неустойки (ЦРК) (большая закупка) |
| `ceContractExecutionPenaltyAccrual` | fcsIntegration.xsd | Пакет данных:Сведения о начислении неустойки (ЦРК) (большая закупка) |
| `ceContractExecutionPenaltyAccrual` | fcsPrintForm.xsd | Сведения о начислении неустойки (ЦРК) (большая закупка) |
| `ceContractExecutionPenaltyHolding` | fcsExtegration.xsd | Сведения об удержании неустойки (ЦРК) (большая закупка) |
| `ceContractExecutionPenaltyHolding` | fcsIntegration.xsd | Пакет данных:Сведения об удержании неустойки (ЦРК) (большая закупка) |
| `ceContractExecutionPenaltyHolding` | fcsPrintForm.xsd | Сведения об удержании неустойки (ЦРК) (большая закупка) |
| `ceContractExecutionPenaltyWriteOff` | fcsExtegration.xsd | Сведения о списании неустойки (ЦРК) (большая закупка) |
| `ceContractExecutionPenaltyWriteOff` | fcsIntegration.xsd | Пакет данных:Сведения о списании неустойки (ЦРК) (большая закупка) |
| `ceContractExecutionPenaltyWriteOff` | fcsPrintForm.xsd | Сведения о списании неустойки (ЦРК) (большая закупка) |
| `ceContractTerminationUnilateralRefusal` | fcsExtegration.xsd | Сведения об одностороннем расторжении контракта (ЦРК) (большая закупка) |
| `ceContractTerminationUnilateralRefusal` | fcsIntegration.xsd | Пакет данных:Сведения об одностороннем расторжении контракта (ЦРК) (большая закупка) |
| `ceContractTerminationUnilateralRefusal` | fcsPrintForm.xsd | Сведения об одностороннем расторжении контракта (ЦРК) (большая закупка) |
| `cemClosedContractBankGuaranteeReturn` | fcsIntegration.xsd | Пакет данных:Сведения об исполнении контракта о возвращении независимой гарантии гаранту или об уведомлении, направляемом заказчиком гаранту, об отказе от прав по гарантии (непубличные данные) |
| `cemClosedContractBankGuaranteeReturn` | fcsPrintForm.xsd | Сведения об исполнении контракта о возвращении независимой гарантии гаранту или об уведомлении, направляемом заказчиком гаранту, об отказе от прав по гарантии (непубличные данные) |
| `cemClosedContractBankGuaranteeReturnInvalid` | fcsIntegration.xsd | Пакет данных:Сведения об исполнении контракта о недействительности информации о возвращении независимой гарантии или об уведомлении, направляемом заказчиком гаранту, об отказе от прав по гарантии (непубличные данные) |
| `cemClosedContractBankGuaranteeReturnInvalid` | fcsPrintForm.xsd | Сведения об исполнении контракта о недействительности информации о возвращении независимой гарантии или об уведомлении, направляемом заказчиком гаранту, об отказе от прав по гарантии (непубличные данные) |
| `cemClosedContractBankGuaranteeTermination` | fcsIntegration.xsd | Пакет данных:Сведения об исполнении контракта по прекращению обязательств поставщика по независимой гарантии |
| `cemClosedContractBankGuaranteeTermination` | fcsPrintForm.xsd | Сведения об исполнении контракта по прекращению обязательств поставщика по независимой гарантии (непубличные данные) |
| `cemClosedContractBankGuaranteeTerminationInvalid` | fcsIntegration.xsd | Пакет данных:Сведения об исполнении контракта о недействительности информации о прекращении обязательств поставщика по независимой гарантии (непубличные данные) |
| `cemClosedContractBankGuaranteeTerminationInvalid` | fcsPrintForm.xsd | Сведения об исполнении контракта о недействительности информации о прекращении обязательств поставщика по независимой гарантии (непубличные данные) |
| `cemClosedContractExecutionCancel` | fcsExtegration.xsd | Отмена сведений об исполнении контракта (ЦРК) (непубличные данные) |
| `cemClosedContractExecutionCancel` | fcsIntegration.xsd | Пакет данных:Отмена сведений об исполнении контракта (ЦРК) (непубличные данные) |
| `cemClosedContractExecutionCancel` | fcsPrintForm.xsd | Отмена сведений об исполнении контракта (ЦРК) (непубличные данные) |
| `cemClosedContractExecutionCancelFailure` | fcsExtegration.xsd | Отмена информации об отмене сведений об исполнении (расторжении) контракта (ЦРК) (непубличные данные) |
| `cemClosedContractExecutionCancelFailure` | fcsIntegration.xsd | Пакет данных:Отмена информации об отмене сведений об исполнении (расторжении) контракта (ЦРК) |
| `cemClosedContractExecutionCancelFailure` | fcsPrintForm.xsd | Отмена информации об отмене сведений об исполнении (расторжении) контракта (ЦРК) (непубличные данные) |
| `cemClosedContractExecutionDocAcceptance` | fcsExtegration.xsd | Сведения об исполнении контракта по документу о приемке (ЦРК) (непубличные данные) |
| `cemClosedContractExecutionDocAcceptance` | fcsIntegration.xsd | Пакет данных:Сведения об исполнении контракта по документу о приемке (ЦРК) (непубличные данные) |
| `cemClosedContractExecutionDocAcceptance` | fcsPrintForm.xsd | Сведения об исполнении контракта по документу о приемке (ЦРК) (непубличные данные) |
| `cemClosedContractExecutionDocAcceptanceCancel` | fcsExtegration.xsd | Отмена сведений об исполнении контракта по документу о приемке (ЦРК) (непубличные данные). Устарело, не применяется, начиная с версии 16.3 |
| `cemClosedContractExecutionDocAcceptanceCancel` | fcsIntegration.xsd | Пакет данных:Отмена сведений об исполнении контракта по документу о приемке (ЦРК) (непубличные данные). Устарело, не применяется, начиная с версии 16.3 |
| `cemClosedContractExecutionDocAcceptanceCancel` | fcsPrintForm.xsd | Отмена сведений об исполнении контракта по документу о приемке (ЦРК) (непубличные данные). Устарело, не применяется, начиная с версии 16.3 |
| `cemClosedContractExecutionObligationGuarantee` | fcsExtegration.xsd | Сведения о наступлении гарантийного случая или исполнении гарантийных обязательств(непубличные данные) |
| `cemClosedContractExecutionObligationGuarantee` | fcsIntegration.xsd | Пакет данных: Сведения о наступлении гарантийного случая или исполнении гарантийных обязательств (ЦРК) (непубличные данные) |
| `cemClosedContractExecutionObligationGuarantee` | fcsPrintForm.xsd | Сведения о наступлении гарантийного случая или исполнении гарантийных обязательств(непубличные данные) |
| `cemClosedContractExecutionPayment` | fcsExtegration.xsd | Сведения об оплате (возврате оплаты) (ЦРК) (непубличные данные) |
| `cemClosedContractExecutionPayment` | fcsIntegration.xsd | Пакет данных:Сведения об оплате (возврате оплаты) (ЦРК) (непубличные данные) |
| `cemClosedContractExecutionPayment` | fcsPrintForm.xsd | Сведения об оплате (возврате оплаты) (ЦРК) (непубличные данные) |
| `cemClosedContractExecutionPenaltyAccrual` | fcsExtegration.xsd | Сведения о начислении неустойки (ЦРК) (непубличные данные) |
| `cemClosedContractExecutionPenaltyAccrual` | fcsIntegration.xsd | Пакет данных:Сведения о начислении неустойки (ЦРК) (непубличные данные) |
| `cemClosedContractExecutionPenaltyAccrual` | fcsPrintForm.xsd | Сведения о начислении неустойки (ЦРК) (непубличные данные) |
| `cemClosedContractExecutionPenaltyHolding` | fcsExtegration.xsd | Сведения об удержании неустойки (ЦРК) (непубличные данные) |
| `cemClosedContractExecutionPenaltyHolding` | fcsIntegration.xsd | Пакет данных:Сведения об удержании неустойки (ЦРК) (непубличные данные) |
| `cemClosedContractExecutionPenaltyHolding` | fcsPrintForm.xsd | Сведения об удержании неустойки (ЦРК) (непубличные данные) |
| `cemClosedContractExecutionPenaltyWriteOff` | fcsExtegration.xsd | Сведения о списании неустойки (ЦРК) (непубличные данные) |
| `cemClosedContractExecutionPenaltyWriteOff` | fcsIntegration.xsd | Пакет данных:Сведения о списании неустойки (ЦРК) (непубличные данные) |
| `cemClosedContractExecutionPenaltyWriteOff` | fcsPrintForm.xsd | Сведения о списании неустойки (ЦРК) (непубличные данные) |
| `cemClosedContractTerminationUnilateralRefusal` | fcsExtegration.xsd | Сведения об одностороннем расторжении контракта (ЦРК) (непубличные данные) |
| `cemClosedContractTerminationUnilateralRefusal` | fcsIntegration.xsd | Пакет данных:Сведения об одностороннем расторжении контракта (ЦРК) (непубличные данные) |
| `cemClosedContractTerminationUnilateralRefusal` | fcsPrintForm.xsd | Сведения об одностороннем расторжении контракта (ЦРК) (непубличные данные) |
| `cemClosedContractTerminationUnilateralRefusalCancel` | fcsExtegration.xsd | Отмена сведений об одностороннем расторжении контракта (ЦРК) (непубличные данные). Устарело, не применяется, начиная с версии 16.3 |
| `cemClosedContractTerminationUnilateralRefusalCancel` | fcsIntegration.xsd | Пакет данных:Отмена сведений об одностороннем расторжении контракта (ЦРК) (непубличные данные). Устарело, не применяется, начиная с версии 16.3 |
| `cemClosedContractTerminationUnilateralRefusalCancel` | fcsPrintForm.xsd | Отмена сведений об одностороннем расторжении контракта (ЦРК) (непубличные данные). Устарело, не применяется, начиная с версии 16.3 |
| `cemContractExecutionCancel` | fcsExtegration.xsd | Отмена сведений об исполнении контракта (ЦРК) |
| `cemContractExecutionCancel` | fcsIntegration.xsd | Пакет данных:Отмена сведений об исполнении контракта (ЦРК) |
| `cemContractExecutionCancel` | fcsPrintForm.xsd | Отмена сведений об исполнении контракта (ЦРК) |
| `cemContractExecutionCancelFailure` | fcsExtegration.xsd | Отмена информации об отмене сведений об исполнении (расторжении) контракта (ЦРК) |
| `cemContractExecutionCancelFailure` | fcsIntegration.xsd | Пакет данных:Отмена информации об отмене сведений об исполнении (расторжении) контракта (ЦРК) |
| `cemContractExecutionCancelFailure` | fcsPrintForm.xsd | Отмена информации об отмене сведений об исполнении (расторжении) контракта (ЦРК) |
| `cemContractExecutionDocAcceptance` | fcsExtegration.xsd | Сведения об исполнении контракта по документу о приемке (ЦРК) |
| `cemContractExecutionDocAcceptance` | fcsIntegration.xsd | Пакет данных:Сведения об исполнении контракта по документу о приемке (ЦРК) |
| `cemContractExecutionDocAcceptance` | fcsPrintForm.xsd | Сведения об исполнении контракта по документу о приемке (ЦРК) |
| `cemContractExecutionDocAcceptanceCancel` | fcsExtegration.xsd | Отмена сведений об исполнении контракта по документу о приемке (ЦРК). Устарело, не применяется, начиная с версии 16.3 |
| `cemContractExecutionDocAcceptanceCancel` | fcsIntegration.xsd | Пакет данных:Отмена сведений об исполнении контракта по документу о приемке (ЦРК). Устарело, не применяется, начиная с версии 16.3 |
| `cemContractExecutionDocAcceptanceCancel` | fcsPrintForm.xsd | Отмена сведений об исполнении контракта по документу о приемке (ЦРК). Устарело, не применяется, начиная с версии 16.3 |
| `cemContractExecutionObligationGuarantee` | fcsExtegration.xsd | Сведения о наступлении гарантийного случая или исполнении гарантийных обязательств |
| `cemContractExecutionObligationGuarantee` | fcsIntegration.xsd | Пакет данных: Сведения о наступлении гарантийного случая или исполнении гарантийных обязательств (ЦРК) |
| `cemContractExecutionObligationGuarantee` | fcsPrintForm.xsd | Сведения о наступлении гарантийного случая или исполнении гарантийных обязательств |
| `cemContractExecutionPayment` | fcsExtegration.xsd | Сведения об оплате (возврате оплаты) (ЦРК) |
| `cemContractExecutionPayment` | fcsIntegration.xsd | Пакет данных:Сведения об оплате (возврате оплаты) (ЦРК) |
| `cemContractExecutionPayment` | fcsPrintForm.xsd | Сведения об оплате (возврате оплаты) (ЦРК) |
| `cemContractExecutionPenaltyAccrual` | fcsExtegration.xsd | Сведения о начислении неустойки (ЦРК) |
| `cemContractExecutionPenaltyAccrual` | fcsIntegration.xsd | Пакет данных:Сведения о начислении неустойки (ЦРК) |
| `cemContractExecutionPenaltyAccrual` | fcsPrintForm.xsd | Сведения о начислении неустойки (ЦРК) |
| `cemContractExecutionPenaltyHolding` | fcsExtegration.xsd | Сведения об удержании неустойки (ЦРК) |
| `cemContractExecutionPenaltyHolding` | fcsIntegration.xsd | Пакет данных:Сведения об удержании неустойки (ЦРК) |
| `cemContractExecutionPenaltyHolding` | fcsPrintForm.xsd | Сведения об удержании неустойки (ЦРК) |
| `cemContractExecutionPenaltyWriteOff` | fcsExtegration.xsd | Сведения о списании неустойки (ЦРК) |
| `cemContractExecutionPenaltyWriteOff` | fcsIntegration.xsd | Пакет данных:Сведения о списании неустойки (ЦРК) |
| `cemContractExecutionPenaltyWriteOff` | fcsPrintForm.xsd | Сведения о списании неустойки (ЦРК) |
| `cemContractTerminationUnilateralRefusal` | fcsExtegration.xsd | Сведения об одностороннем расторжении контракта (ЦРК) |
| `cemContractTerminationUnilateralRefusal` | fcsIntegration.xsd | Пакет данных:Сведения об одностороннем расторжении контракта (ЦРК) |
| `cemContractTerminationUnilateralRefusal` | fcsPrintForm.xsd | Сведения об одностороннем расторжении контракта (ЦРК) |
| `cemContractTerminationUnilateralRefusalCancel` | fcsExtegration.xsd | Отмена сведений об одностороннем расторжении контракта (ЦРК). Устарело, не применяется, начиная с версии 16.3 |
| `cemContractTerminationUnilateralRefusalCancel` | fcsIntegration.xsd | Пакет данных:Отмена сведений об одностороннем расторжении контракта (ЦРК). Устарело, не применяется, начиная с версии 16.3 |
| `cemContractTerminationUnilateralRefusalCancel` | fcsPrintForm.xsd | Отмена сведений об одностороннем расторжении контракта (ЦРК). Устарело, не применяется, начиная с версии 16.3 |
| `changeHiddenRequest` | fcsIntegration.xsd | Пакет данных: Запрос на изменение признака сокрытия независимой гарантии. Служебный документ, не используется при обмене с внешними системами |
| `checkPlan` | fcsIntegration.xsd | Пакет данных: План проверок |
| `checkPlan` | fcsPrintForm.xsd | План проверок для ИС КО |
| `checkResult` | fcsIntegration.xsd | Пакет данных: Результат контроля |
| `checkResult` | fcsPrintForm.xsd | Результат контроля для ИС КО |
| `checkResultCancel` | fcsIntegration.xsd | Пакет данных: Информация об отмене результата контроля |
| `checkResultCancel` | fcsPrintForm.xsd | Информация об отмене результата контроля для ИС КО |
| `chunkRequest` | eis-fs-ws-api.xsd | Пакет данных: Запрос на передачу части файла |
| `chunkResponse` | eis-fs-ws-api.xsd | Пакет данных:Ответ на запрос передачи части файла |
| `claimsCorrespondenceNotice` | fcsExtegration.xsd | Проект уведомления в рамках претензионной переписки, сформированное заказчиком |
| `claimsCorrespondenceNotice` | fcsIntegration.xsd | Пакет данных:Уведомление в рамках претензионной переписки, сформированное заказчиком |
| `claimsCorrespondenceNotice` | lkp-eisPrintForm.xsd | Уведомление в рамках претензионной переписки, сформированное заказчиком |
| `closedCheckResult` | fcsIntegration.xsd | Пакет данных: Результат контроля (сокрытый) |
| `closedCheckResult` | fcsPrintForm.xsd | Результат контроля (сокрытого) для ИС КО |
| `closedCheckResultCancel` | fcsIntegration.xsd | Пакет данных: Информация об отмене сокрытого результата контроля |
| `closedCheckResultCancel` | fcsPrintForm.xsd | Информация об отмене сокрытой результата контроля для ИС КО |
| `closedComplaint` | fcsIntegration.xsd | Пакет данных: Информация по сокрытой жалобе |
| `closedComplaint` | fcsPrintForm.xsd | Информация по сокрытой жалобе для ИС КО |
| `closedComplaintCancel` | fcsIntegration.xsd | Пакет данных: Информация об отзыве сокрытой жалобы |
| `closedComplaintCancel` | fcsPrintForm.xsd | Информация об отзыве сокрытой жалобы для ИС КО |
| `closedComplaintTransfer` | fcsIntegration.xsd | Пакет данных: Информация о передаче сокрытой жалобы по подведомственности / ведомственной принадлежности |
| `closedComplaintTransfer` | fcsPrintForm.xsd | Информация о передаче сокрытой жалобы по подведомственности / ведомственной принадлежности |
| `closedContract` | fcsExtegration.xsd | Проект информации о заключенном контракте (непубличные данные) |
| `closedContract` | fcsIntegration.xsd | Пакет данных: Информация (проект информации) о заключенном контракте (непубличные данные) |
| `closedContract` | fcsPrintForm.xsd | Информация о заключенном контракте (не публичные данные) |
| `closedContractAvailableForElAct` | fcsIntegration.xsd | Пакет данных:Квитанция о доступности формирования документов электронного актирования по контракту (непубличные данные) |
| `closedContractAvailableForElAct` | fcsPrintForm.xsd | Квитанция о доступности формирования документов электронного актирования по контракту (не публичные данные) |
| `closedContractCancel` | fcsIntegration.xsd | Пакет данных: Информация об анулировании контракта (непубличные данные) |
| `closedContractCancel` | fcsPrintForm.xsd | Информация об аннулировании контракта (не публичные данные) |
| `closedContractExecution` | fcsIntegration.xsd | Пакет данных:Сводная информация о контракте(непубличные данные) |
| `closedContractProcedure` | fcsExtegration.xsd | Проект информации об исполнении (расторжении) контракта (непубличные данные) |
| `closedContractProcedure` | fcsIntegration.xsd | Пакет данных: Информация об исполнении (расторжении) контракта (непубличные данные) |
| `closedContractProcedure` | fcsPrintForm.xsd | Информация об исполнении (расторжении) контракта (не публичные данные) |
| `closedContractProcedureCancel` | fcsExtegration.xsd | Проект информации об отмене исполнения (расторжения) контракта (непубличные данные) |
| `closedContractProcedureCancel` | fcsIntegration.xsd | Пакет данных: Сведения об отмене информации об исполнении (расторжении) контракта (непубличные данные) |
| `closedContractProcedureCancel` | fcsPrintForm.xsd | Информация об отмене исполнения (расторжения) контракта (не публичные данные) |
| `closedCustomerReportRusProductsPurchasesVolume` | fcsPrintForm.xsd | Отчет об объеме закупок российских товаров (непубличные данные) |
| `closedCustomerReportRusProductsPurchasesVolumeInvalid` | fcsPrintForm.xsd | Информация о недействительности сведений отчета об объеме закупок у субъектов малого предпринимательства, социально ориентированных некоммерческих организаций (непубличные данные) |
| `closedCustomerReportRusProductsWorksServicesVolume` | fcsIntegration.xsd | Пакет данных: Отчет об объеме закупок товаров российского происхождения, работ, услуг, соответственно выполняемых, оказываемых российскими гражданами, российскими юридическими лицами (непубличные данные) |
| `closedCustomerReportRusProductsWorksServicesVolume` | fcsPrintForm.xsd | Отчет об объеме закупок товаров российского происхождения, работ, услуг, соответственно выполняемых, оказываемых российскими гражданами, российскими юридическими лицами (непубличные данные) |
| `closedCustomerReportRusProductsWorksServicesVolumeInvalid` | fcsIntegration.xsd | Пакет данных: Информация о недействительности сведений отчета об объеме закупок товаров российского происхождения, работ, услуг, соответственно выполняемых, оказываемых российскими гражданами, российскими юридическими лицами (непубличные данные) |
| `closedCustomerReportRusProductsWorksServicesVolumeInvalid` | fcsPrintForm.xsd | Информация о недействительности сведений отчета об объеме закупок товаров российского происхождения, работ, услуг, соответственно выполняемых, оказываемых российскими гражданами, российскими юридическими лицами (непубличные данные) |
| `closedParElectronicComplaint` | lkp-eisPrintForm.xsd | Информация об сокрытой электронной жалобе, сформированной в ЛКП |
| `closedParElectronicComplaintAccept` | fcsIntegration.xsd | Пакет данных:Информация о принятии к рассмотрению сокрытой электронной жалобы, сформированной в ЛКП |
| `closedParElectronicComplaintAccept` | fcsPrintForm.xsd | Информация о принятии к рассмотрению сокрытой электронной жалобы, сформированной в ЛКП |
| `closedParElectronicComplaintCancel` | lkp-eisPrintForm.xsd | Информация об отзыве сокрытой электронной жалобы, сформированной в ЛКП |
| `closedParElectronicComplaintRefusal` | fcsIntegration.xsd | Пакет данных:Информация об отказе в рассмотрении сокрытой электронной жалобы, сформированной в ЛКП |
| `closedParElectronicComplaintRefusal` | fcsPrintForm.xsd | Информация об отказе в рассмотрении сокрытой электронной жалобы, сформированной в ЛКП |
| `closedUnplannedCheck` | fcsIntegration.xsd | Пакет данных: Информация по сокрытой внеплановой проверке |
| `closedUnplannedCheck` | fcsPrintForm.xsd | Информация по сокрытой внеплановой проверке для ИС КО |
| `closedUnplannedCheckCancel` | fcsIntegration.xsd | Пакет данных: Информация об отмене проведения внеплановой проверки по сокрытой жалобе |
| `closedUnplannedCheckCancel` | fcsPrintForm.xsd | Информация об отмене проведения внеплановой проверки для ИС КО по сокрытой жалобе |
| `closedUnplannedCheckTenderSusp` | fcsIntegration.xsd | Пакет данных: Информация о приостановке определения поставщика (подрядчика, исполнителя) в части заключения контракта по сокрытой внеплановой проверке |
| `complaint` | fcsIntegration.xsd | Пакет данных: Информация по жалобе |
| `complaint` | fcsPrintForm.xsd | Информация по жалобе для ИС КО |
| `complaintCancel` | fcsIntegration.xsd | Пакет данных: Информация об отзыве жалобы |
| `complaintCancel` | fcsPrintForm.xsd | Информация об отзыве жалобы для ИС КО |
| `complaintGroup` | fcsIntegration.xsd | Пакет данных: Информация по групповой жалобе |
| `complaintGroup` | fcsPrintForm.xsd | Информация по групповой жалобе для ИС КО |
| `complaintTransfer` | fcsIntegration.xsd | Пакет данных: Информация о передаче жалобы по подведомственности / ведомственной принадлежности |
| `complaintTransfer` | fcsPrintForm.xsd | Информация о передаче жалобы по подведомственности / ведомственной принадлежности |
| `confirmation` | fcsExtegration.xsd | Протокол загрузки информации |
| `confirmation` | fcsIntegration.xsd | Пакет данных: Уведомление о результатах обработки информационного пакета |
| `confirmationEMZ` | fcsIntegration.xsd | Пакет данных: Уведомление о результатах обработки информационного пакета с присвоенным реестровым номером и датой публикации документа (ЭМЗ) |
| `contract` | fcsExtegration.xsd | Проект проект информации о заключенном контракте |
| `contract` | fcsIntegration.xsd | Пакет данных: Информация (проект информации) о заключенном контракте |
| `contract` | fcsPrintForm.xsd | Информация о заключенном контракте |
| `contractAvailableForElAct` | fcsIntegration.xsd | Пакет данных:Квитанция о доступности формирования документов электронного актирования по контракту |
| `contractAvailableForElAct` | fcsPrintForm.xsd | Квитанция о доступности формирования документов электронного актирования по контракту |
| `contractCancel` | fcsIntegration.xsd | Пакет данных: Информация об анулировании контракта |
| `contractCancel` | fcsPrintForm.xsd | Информация об аннулировании контракта |
| `contractCorrection` | fcsExtegration.xsd | Проект корректировки информации о заключенном контракте |
| `contractCorrection` | fcsIntegration.xsd | Пакет данных:Корректировка информации о заключенном контракте |
| `contractExecution` | fcsIntegration.xsd | Пакет данных:Сводная информация о контракте |
| `contractProcedure` | fcsExtegration.xsd | Проект информации об исполнении (расторжении) контракта |
| `contractProcedure` | fcsIntegration.xsd | Пакет данных: Информация об исполнении (расторжении) контракта |
| `contractProcedure` | fcsPrintForm.xsd | Информация об исполнении (расторжении) контракта |
| `contractProcedureCancel` | fcsExtegration.xsd | Проект информации об отмене исполнения (расторжения) контракта |
| `contractProcedureCancel` | fcsIntegration.xsd | Пакет данных: Сведения об отмене информации об исполнении (расторжении) контракта |
| `contractProcedureCancel` | fcsPrintForm.xsd | Информация об отмене исполнения (расторжения) контракта |
| `contractProcedureIDs` | fcsIntegration.xsd | Пакет данных:Информация об идентификаторах исполнения контракта |
| `contractProcedureUnilateralRefusal` | fcsExtegration.xsd | Проект решения об одностороннем отказе от исполнения контракта, сформированное заказчиком |
| `contractProcedureUnilateralRefusal` | fcsIntegration.xsd | Пакет данных:Решение об одностороннем отказе от исполнения контракта, сформированное заказчиком |
| `contractProcedureUnilateralRefusal` | lkp-eisPrintForm.xsd | Решение об одностороннем отказе от исполнения контракта, сформированное заказчиком |
| `contractProcedureUnilateralRefusalCancel` | fcsExtegration.xsd | Проект извещения об отмене решения об одностороннем отказе от исполнения контракта, сформированное заказчиком |
| `contractProcedureUnilateralRefusalCancel` | fcsIntegration.xsd | Пакет данных:Извещение об отмене решения об одностороннем отказе от исполнения контракта, сформированное заказчиком |
| `contractProcedureUnilateralRefusalCancel` | lkp-eisPrintForm.xsd | Извещение об отмене решения об одностороннем отказе от исполнения контракта, сформированное заказчиком |
| `control99BeginMessage` | fcsIntegration.xsd | Пакет данных: Сообщение о начале контроля |
| `control99BeginMessage` | fcsPrintForm.xsd | Сообщение о начале контроля |
| `control99ContractExtract` | fcsPrintForm.xsd | Информация из контракта (исполнения контракта) (РК), направляемая на контроль по 99 статье в орган контроля |
| `control99NoticeCompliance` | fcsExtegration.xsd | Проект уведомления о соответствии контролируемой информации |
| `control99NoticeCompliance` | fcsIntegration.xsd | Пакет данных:Уведомление о соответствии контролируемой информации |
| `control99NoticeCompliance` | fcsPrintForm.xsd | Уведомление о соответствии контролируемой информации |
| `control99NoticeComplianceWithDoc` | fcsPrintForm.xsd | Уведомление о соответствии контролируемой информации, принятое вместе с контролируемым документом |
| `control99NoticeComplianceWithDocChecklist` | fcsPrintForm.xsd | Уведомление о соответствии контролируемой информации, принятое вместе с контролируемым документом и списком проверки |
| `control99NotificationExtract` | fcsPrintForm.xsd | Информация из извещения (конкурсной документации) (ПРИЗ), направляемая на контроль по 99 статье в орган контроля |
| `control99ProtocolExtract` | fcsPrintForm.xsd | Информация из итогового протокола ОППИ (ПРИЗ), направляемая на контроль по 99 статье в орган контроля |
| `control99ProtocolMismatch` | fcsExtegration.xsd | Проект протокола о несоответствии контролируемой информации |
| `control99ProtocolMismatch` | fcsIntegration.xsd | Пакет данных:Протокол о несоответствии контролируемой информации |
| `control99ProtocolMismatch` | fcsPrintForm.xsd | Протокол о несоответствии контролируемой информации |
| `control99ProtocolMismatchReductFunds` | fcsExtegration.xsd | Проект протокола о несоответствии контролируемой информации в связи с уменьшением средств |
| `control99ProtocolMismatchReductFunds` | fcsIntegration.xsd | Пакет данных:Протокол о несоответствии контролируемой информации в связи с уменьшением средств |
| `control99ProtocolMismatchReductFunds` | fcsPrintForm.xsd | Протокол о несоответствии контролируемой информации в связи с уменьшением средств |
| `control99PurchasePlanExtract` | fcsPrintForm.xsd | Информация из плана закупок (РПЗ), направляемая на контроль по 99 статье в орган контроля |
| `control99RefusalMessage` | fcsIntegration.xsd | Пакет данных:Сообщение об отказе в принятии на контроль |
| `control99RefusalMessage` | fcsPrintForm.xsd | Сообщение об отказе в принятии на контроль |
| `control99TenderPlan2017Extract` | fcsPrintForm.xsd | Информация из плана-графика с 01.01.2017 (РПГ), направляемая на контроль по 99 статье в орган контроля |
| `control99TenderPlan2020Extract` | fcsPrintForm.xsd | Информация из плана-графика закупок с 01.01.2020, направляемая на контроль по 99 статье в орган контроля |
| `control99UniversalExtract` | fcsPrintForm.xsd | Универсальная выжимка, направляемая на контроль в орган контроля согласно приказу Минфина России от 30.10.2020 N 258н и ПП РФ от 6 августа 2020 г. N 119 |
| `controlPaymentDetailsRequest` | fcsExtegration.xsd | Запрос проведения проверки платежных данных |
| `controlPaymentDetailsResponse` | fcsExtegration.xsd | Ответ на запрос проведения проверки платежных данных |
| `cpClosedContractCRK` | fcsExtegration.xsd | Информация о заключенном электронном контракте (непубличные данные) |
| `cpClosedContractCRK` | fcsIntegration.xsd | Пакет данных:Информация о заключенном электронном контракте (непубличные данные) |
| `cpClosedContractCRK` | fcsPrintForm.xsd | Информация о заключенном электронном контракте (непубличные данные) |
| `cpClosedContractProject` | fcsExtegration.xsd | Проект контракта без подписей (непубличные данные) |
| `cpClosedContractProject` | fcsIntegration.xsd | Пакет данных:Проект контракта без подписей (непубличные данные) |
| `cpClosedContractProject` | fcsPrintForm.xsd | Проект контракта без подписей (непубличные данные) |
| `cpClosedContractProjectChange` | fcsExtegration.xsd | Доработанный проект контракта на основании размещенного поставщиком протокола разногласий (непубличные данные) |
| `cpClosedContractProjectChange` | fcsIntegration.xsd | Пакет данных:Доработанный проект контракта на основании размещенного поставщиком протокола разногласий (непубличные данные) |
| `cpClosedContractProjectChange` | fcsPrintForm.xsd | Доработанный проект контракта на основании размещенного поставщиком протокола разногласий (непубличные данные) |
| `cpClosedContractProjectChangeLKP` | fcsExtegration.xsd | Доработанный проект контракта на основании размещенного поставщиком протокола разногласий для взаимодействия с ЛКП (непубличные данные) |
| `cpClosedContractProjectChangeLKP` | fcsIntegration.xsd | Пакет данных:Доработанный проект контракта на основании размещенного поставщиком протокола разногласий для взаимодействия с ЛКП (непубличные данные) |
| `cpClosedContractProjectChangeLKP` | fcsPrintForm.xsd | Доработанный проект контракта на основании размещенного поставщиком протокола разногласий для взаимодействия с ЛКП (непубличные данные) |
| `cpClosedContractProjectLKP` | fcsExtegration.xsd | Проект контракта без подписей для взаимодействия с ЛКП (непубличные данные) |
| `cpClosedContractProjectLKP` | fcsIntegration.xsd | Пакет данных:Проект контракта без подписей для взаимодействия с ЛКП (непубличные данные) |
| `cpClosedContractProjectLKP` | fcsPrintForm.xsd | Проект контракта без подписей для взаимодействия с ЛКП (непубличные данные) |
| `cpClosedContractProjectSign` | fcsIntegration.xsd | Пакет данных:Проект контракта, подписанный поставщиком (непубличные данные) |
| `cpClosedContractProjectSignLKP` | fcsIntegration.xsd | Пакет данных:Проект контракта, подписанный поставщиком для взаимодействия с ЛКП (непубличные данные) |
| `cpClosedContractProjectSignLKP` | lkp-eisPrintForm.xsd | Проект контракта, подписанный поставщиком для взаимодействия с ЛКП (непубличные данные). Не применяется, добавлено на развитие |
| `cpClosedContractSign` | fcsIntegration.xsd | Пакет данных:Подписанный контракт (непубличные данные) |
| `cpClosedContractSign` | fcsPrintForm.xsd | Подписанный контракт (непубличные данные) |
| `cpClosedContractSignLKP` | fcsIntegration.xsd | Пакет данных:Подписанный контракт для взаимодействия с ЛКП (непубличные данные) |
| `cpClosedContractSignLKP` | fcsPrintForm.xsd | Подписанный контракт для взаимодействия с ЛКП (непубличные данные) |
| `cpClosedContractTerminationCancel` | fcsExtegration.xsd | Извещение об отмене сведений о расторжении контракта (ЦРК) (большая закупка) (непубличные данные) |
| `cpClosedContractTerminationCancel` | fcsIntegration.xsd | Пакет данных:Извещение об отмене сведений о расторжении контракта (большая закупка) (ЦРК) (большая закупка) (непубличные данные) |
| `cpClosedContractTerminationCancel` | fcsPrintForm.xsd | Извещение об отмене сведений о расторжении контракта (ЦРК) (большая закупка) (непубличные данные) |
| `cpClosedContractTerminationProject` | fcsExtegration.xsd | Проект сведений о расторжении контракта (ЦРК) (большая закупка) (непубличные данные) |
| `cpClosedContractTerminationProject` | fcsIntegration.xsd | Пакет данных:Проект сведений о расторжении контракта(большая закупка) (ЦРК) (большая закупка) (непубличные данные) |
| `cpClosedContractTerminationProject` | fcsPrintForm.xsd | Проект сведений о расторжении контракта (ЦРК) (большая закупка) (непубличные данные) |
| `cpClosedContractTerminationSign` | fcsExtegration.xsd | Подписанные сведения о расторжении контракта (ЦРК) (большая закупка) (непубличные данные) |
| `cpClosedContractTerminationSign` | fcsIntegration.xsd | Пакет данных:Подписанные сведения о расторжении контракта (большая закупка) (ЦРК) (большая закупка) (непубличные данные) |
| `cpClosedContractTerminationSign` | fcsPrintForm.xsd | Подписанные сведения о расторжении контракта (ЦРК) (большая закупка) (непубличные данные) |
| `cpClosedNoticeDeviation` | fcsIntegration.xsd | Пакет данных:Уведомление об уклонении от заключения контракта (непубличные данные) |
| `cpClosedNoticeDeviation` | fcsPrintForm.xsd | Уведомление об уклонении от заключения контракта (непубличные данные) |
| `cpClosedNoticeEvasion` | fcsIntegration.xsd | Пакет данных:Уведомление об отказе от заключения контракта (непубличные данные). Устарело не применяется |
| `cpClosedNoticeEvasion` | fcsPrintForm.xsd | Уведомление об отказе от заключения контракта (непубличные данные). Устарело не применяется |
| `cpClosedProcedureCancel` | fcsExtegration.xsd | Проект извещения об отмене процедуры заключения контракта (непубличные данные) |
| `cpClosedProcedureCancel` | fcsIntegration.xsd | Пакет данных:Извещение об отмене процедуры заключения контракта (непубличные данные) |
| `cpClosedProcedureCancel` | fcsPrintForm.xsd | Извещение об отмене процедуры заключения контракта (непубличные данные) |
| `cpClosedProcedureCancelFailure` | fcsIntegration.xsd | Пакет данных:Отмена извещения об отмене процедуры заключения контракта (непубличные данные) |
| `cpClosedProcedureCancelLKP` | fcsExtegration.xsd | Извещение об отмене процедуры заключения контракта для взаимодействия с ЛКП (непубличные данные) |
| `cpClosedProcedureCancelLKP` | fcsIntegration.xsd | Пакет данных:Извещение об отмене процедуры заключения контракта для взаимодействия с ЛКП (непубличные данные) |
| `cpClosedProcedureCancelLKP` | fcsPrintForm.xsd | Извещение об отмене процедуры заключения контракта для взаимодействия с ЛКП (непубличные данные) |
| `cpClosedProtocolDisagreements` | fcsIntegration.xsd | Пакет данных:Протокол разногласий (непубличные данные) |
| `cpClosedProtocolDisagreements` | fcsPrintForm.xsd | Протокол разногласий (непубличные данные) |
| `cpClosedProtocolDisagreementsLKP` | fcsIntegration.xsd | Пакет данных:Протокол разногласий для взаимодействия с ЛКП (непубличные данные) |
| `cpClosedProtocolDisagreementsLKP` | lkp-eisPrintForm.xsd | Протокол разногласий для взаимодействия с ЛКП (непубличные данные). Не применяется, добавлено на развитие |
| `cpClosedRefusalConcludeContract` | fcsIntegration.xsd | Пакет данных:Отказ участника закупки от заключения контракта (непубличные данные) |
| `cpClosedRefusalConcludeContract` | fcsPrintForm.xsd | Отказ участника закупки от заключения контракта (непубличные данныеы) |
| `cpClosedRefusalConcludeContractLKP` | lkp-eisPrintForm.xsd | Отказ участника закупки от заключения контракта для взаимодействия с ЛКП (непубличные данные). Не применяется, добавлено на развитие |
| `cpContractCRK` | fcsExtegration.xsd | Информация о заключенном электронном контракте |
| `cpContractCRK` | fcsIntegration.xsd | Пакет данных:Информация о заключенном электронном контракте |
| `cpContractCRK` | fcsPrintForm.xsd | Информация о заключенном электронном контракте |
| `cpContractProject` | fcsExtegration.xsd | Проект контракта без подписей |
| `cpContractProject` | fcsIntegration.xsd | Пакет данных:Проект контракта без подписей |
| `cpContractProject` | fcsPrintForm.xsd | Проект контракта без подписей |
| `cpContractProjectChange` | fcsExtegration.xsd | Доработанный проект контракта на основании размещенного поставщиком протокола разногласий |
| `cpContractProjectChange` | fcsIntegration.xsd | Пакет данных:Доработанный проект контракта на основании размещенного поставщиком протокола разногласий |
| `cpContractProjectChange` | fcsPrintForm.xsd | Доработанный проект контракта на основании размещенного поставщиком протокола разногласий |
| `cpContractProjectChangeLKP` | fcsExtegration.xsd | Доработанный проект контракта на основании размещенного поставщиком протокола разногласий для взаимодействия с ЛКП |
| `cpContractProjectChangeLKP` | fcsIntegration.xsd | Пакет данных:Доработанный проект контракта на основании размещенного поставщиком протокола разногласий для взаимодействия с ЛКП |
| `cpContractProjectChangeLKP` | fcsPrintForm.xsd | Доработанный проект контракта на основании размещенного поставщиком протокола разногласий для взаимодействия с ЛКП |
| `cpContractProjectLKP` | fcsExtegration.xsd | Проект контракта без подписей для взаимодействия с ЛКП |
| `cpContractProjectLKP` | fcsIntegration.xsd | Пакет данных:Проект контракта без подписей для взаимодействия с ЛКП |
| `cpContractProjectLKP` | fcsPrintForm.xsd | Проект контракта без подписей для взаимодействия с ЛКП |
| `cpContractProjectSign` | fcsIntegration.xsd | Пакет данных:Проект контракта, подписанный поставщиком |
| `cpContractProjectSignLKP` | fcsIntegration.xsd | Пакет данных:Проект контракта, подписанный поставщиком для взаимодействия с ЛКП |
| `cpContractProjectSignLKP` | lkp-eisPrintForm.xsd | Проект контракта, подписанный поставщиком для взаимодействия с ЛКП |
| `cpContractSign` | fcsIntegration.xsd | Пакет данных:Подписанный контракт |
| `cpContractSign` | fcsPrintForm.xsd | Подписанный контракт |
| `cpContractSignLKP` | fcsIntegration.xsd | Пакет данных:Подписанный контракт для взаимодействия с ЛКП |
| `cpContractSignLKP` | fcsPrintForm.xsd | Подписанный контракт для взаимодействия с ЛКП |
| `cpContractTerminationCancel` | fcsExtegration.xsd | Извещение об отмене сведений о расторжении контракта (ЦРК) (большая закупка) |
| `cpContractTerminationCancel` | fcsIntegration.xsd | Пакет данных:Извещение об отмене сведений о расторжении контракта (ЦРК) (большая закупка)) |
| `cpContractTerminationCancel` | fcsPrintForm.xsd | Извещение об отмене сведений о расторжении контракта (ЦРК) (большая закупка) |
| `cpContractTerminationProject` | fcsExtegration.xsd | Проект сведений о расторжении контракта (ЦРК) (большая закупка) |
| `cpContractTerminationProject` | fcsIntegration.xsd | Пакет данных:Проект сведений о расторжении контракта (ЦРК) (большая закупка) |
| `cpContractTerminationProject` | fcsPrintForm.xsd | Проект сведений о расторжении контракта (ЦРК) (большая закупка) |
| `cpContractTerminationSign` | fcsExtegration.xsd | Подписанные сведения о расторжении контракта (ЦРК) (большая закупка) |
| `cpContractTerminationSign` | fcsIntegration.xsd | Пакет данных:Подписанные сведения о расторжении контракта (ЦРК) (большая закупка) |
| `cpContractTerminationSign` | fcsPrintForm.xsd | Подписанные сведения о расторжении контракта (ЦРК) (большая закупка) |
| `cpControl99ContractProjectExtract` | fcsPrintForm.xsd | Информация из проекта контракта, направляемая на контроль по 99 статье в орган контроля |
| `cpDelta` | lkp-eisPrintForm.xsd | Дельта доп.соглашения |
| `cpElectronicContract` | fcsExtegration.xsd | Электронный контракт |
| `cpElectronicContract` | fcsIntegration.xsd | Электронный контракт |
| `cpElectronicContract` | fcsPrintForm.xsd | Электронный контракт |
| `cpmClosedContractCRK` | fcsExtegration.xsd | Информация о заключенном электронном контракте (малая закупка) (непубличные данные) |
| `cpmClosedContractCRK` | fcsIntegration.xsd | Пакет данных:Информация о заключенном электронном контракте (малая закупка) (непубличные данные) |
| `cpmClosedContractCRK` | fcsPrintForm.xsd | Информация о заключенном электронном контракте (малая закупка) (непубличные данные) |
| `cpmClosedContractProject` | fcsExtegration.xsd | Проект контракта без подписей (малая закупка) (непубличные данные) |
| `cpmClosedContractProject` | fcsIntegration.xsd | Пакет данных:Проект контракта без подписей (малая закупка) (непубличные данные) |
| `cpmClosedContractProject` | fcsPrintForm.xsd | Проект контракта без подписей (малая закупка) (непубличные данные) |
| `cpmClosedContractProjectChange` | fcsExtegration.xsd | Доработанный проект контракта на основании размещенного поставщиком протокола разногласий (малая закупка) (непубличные данные) |
| `cpmClosedContractProjectChange` | fcsIntegration.xsd | Пакет данных:Доработанный проект контракта на основании размещенного поставщиком протокола разногласий (малая закупка) (непубличные данные) |
| `cpmClosedContractProjectChange` | fcsPrintForm.xsd | Доработанный проект контракта на основании размещенного поставщиком протокола разногласий (малая закупка) (непубличные данные) |
| `cpmClosedContractProjectSign` | fcsIntegration.xsd | Пакет данных:Проект контракта, подписанный поставщиком (малая закупка) (непубличные данные) |
| `cpmClosedContractProjectSign` | lkp-eisPrintForm.xsd | Проект контракта, подписанный поставщиком (малая закупка) (непубличные данные). Не применяется, добавлено на развитие |
| `cpmClosedContractSign` | fcsIntegration.xsd | Пакет данных:Подписанный контракт (малая закупка) (непубличные данные) |
| `cpmClosedContractSign` | fcsPrintForm.xsd | Подписанный контракт (малая закупка) (непубличные данные) |
| `cpmClosedContractTerminationCancel` | fcsExtegration.xsd | Извещение об отмене сведений о расторжении контракта (малая закупка) (непубличные данные) |
| `cpmClosedContractTerminationCancel` | fcsIntegration.xsd | Пакет данных:Извещение об отмене сведений о расторжении контракта (малая закупка) (непубличные данные) |
| `cpmClosedContractTerminationCancel` | fcsPrintForm.xsd | Извещение об отмене сведений о расторжении контракта (малая закупка) (непубличные данные) |
| `cpmClosedContractTerminationProject` | fcsExtegration.xsd | Проект сведений о расторжении контракта (малая закупка) (непубличные данные) |
| `cpmClosedContractTerminationProject` | fcsIntegration.xsd | Пакет данных:Проект сведений о расторжении контракта (малая закупка) (непубличные данные) |
| `cpmClosedContractTerminationProject` | fcsPrintForm.xsd | Проект сведений о расторжении контракта (малая закупка) (непубличные данные) |
| `cpmClosedContractTerminationSign` | fcsExtegration.xsd | Подписанные сведения о расторжении контракта (малая закупка) (непубличные данные) |
| `cpmClosedContractTerminationSign` | fcsIntegration.xsd | Пакет данных:Подписанные сведения о расторжении контракта (малая закупка) (непубличные данные) |
| `cpmClosedContractTerminationSign` | fcsPrintForm.xsd | Подписанные сведения о расторжении контракта (малая закупка) (непубличные данные) |
| `cpmClosedProcedureCancel` | fcsExtegration.xsd | Извещение об отмене процедуры заключения контракта (малая закупка) (непубличные данные) |
| `cpmClosedProcedureCancel` | fcsIntegration.xsd | Пакет данных:Извещение об отмене процедуры заключения контракта (малая закупка) (непубличные данные) |
| `cpmClosedProcedureCancel` | fcsPrintForm.xsd | Извещение об отмене процедуры заключения контракта (малая закупка) (непубличные данные) |
| `cpmClosedProtocolDisagreements` | fcsIntegration.xsd | Пакет данных:Протокол разногласий (малая закупка) (непубличные данные) |
| `cpmClosedProtocolDisagreements` | lkp-eisPrintForm.xsd | Протокол разногласий (малая закупка) (непубличные данные). Не применяется, добавлено на развитие |
| `cpmClosedRefusalConcludeContract` | fcsIntegration.xsd | Пакет данных:Отказ участника закупки от заключения контракта (малая закупка) (непубличные данные) |
| `cpmClosedRefusalConcludeContract` | lkp-eisPrintForm.xsd | Отказ участника закупки от заключения контракта (малая закупка) (непубличные данные). Не применяется, добавлено на развитие |
| `cpmContractCRK` | fcsExtegration.xsd | "Информация о заключенном электронном контракте (малая закупка) |
| `cpmContractCRK` | fcsIntegration.xsd | Пакет данных:Информация о заключенном электронном контракте (малая закупка) |
| `cpmContractCRK` | fcsPrintForm.xsd | Информация о заключенном электронном контракте (малая закупка) |
| `cpmContractProject` | fcsExtegration.xsd | Проект контракта без подписей (малая закупка) |
| `cpmContractProject` | fcsIntegration.xsd | Пакет данных:Проект контракта без подписей (малая закупка) |
| `cpmContractProject` | fcsPrintForm.xsd | Проект контракта без подписей (малая закупка) |
| `cpmContractProjectChange` | fcsExtegration.xsd | Доработанный проект контракта на основании размещенного поставщиком протокола разногласий (малая закупка) |
| `cpmContractProjectChange` | fcsIntegration.xsd | Пакет данных:Доработанный проект контракта на основании размещенного поставщиком протокола разногласий (малая закупка) |
| `cpmContractProjectChange` | fcsPrintForm.xsd | Доработанный проект контракта на основании размещенного поставщиком протокола разногласий (малая закупка) |
| `cpmContractProjectSign` | fcsIntegration.xsd | Пакет данных:Проект контракта, подписанный поставщиком (малая закупка) |
| `cpmContractProjectSign` | lkp-eisPrintForm.xsd | Проект контракта, подписанный поставщиком (малая закупка). Не применяется, добавлено на развитие |
| `cpmContractSign` | fcsIntegration.xsd | Пакет данных:Подписанный контракт (малая закупка) |
| `cpmContractSign` | fcsPrintForm.xsd | Подписанный контракт (малая закупка) |
| `cpmContractTerminationCancel` | fcsExtegration.xsd | Извещение об отмене сведений о расторжении контракта (ЦРК) (малая закупка) |
| `cpmContractTerminationCancel` | fcsIntegration.xsd | Пакет данных:Извещение об отмене сведений о расторжении контракта (ЦРК) (малая закупка) |
| `cpmContractTerminationCancel` | fcsPrintForm.xsd | Извещение об отмене сведений о расторжении контракта (ЦРК) (малая закупка) |
| `cpmContractTerminationProject` | fcsExtegration.xsd | Проект сведений о расторжении контракта (ЦРК) (малая закупка) |
| `cpmContractTerminationProject` | fcsIntegration.xsd | Пакет данных:Проект сведений о расторжении контракта (ЦРК) (малая закупка) |
| `cpmContractTerminationProject` | fcsPrintForm.xsd | Проект сведений о расторжении контракта (ЦРК) (малая закупка) |
| `cpmContractTerminationSign` | fcsExtegration.xsd | Подписанные сведения о расторжении контракта (ЦРК) (малая закупка) |
| `cpmContractTerminationSign` | fcsIntegration.xsd | Пакет данных:Подписанные сведения о расторжении контракта (ЦРК) (малая закупка) |
| `cpmContractTerminationSign` | fcsPrintForm.xsd | Подписанные сведения о расторжении контракта (ЦРК) (малая закупка) |
| `cpmControlPaymentDetailsRequest` | fcsExtegration.xsd | Запрос проведения проверки платежных данных (малые закупки) |
| `cpmControlPaymentDetailsResponse` | fcsExtegration.xsd | Ответ на запрос проведения проверки платежных данных (малые закупки) |
| `cpmElectronicContract` | fcsExtegration.xsd | Электронный контракт (малая закупка) |
| `cpmElectronicContract` | fcsIntegration.xsd | Пакет данных:Электронный контракт (малая закупка) |
| `cpmElectronicContract` | fcsPrintForm.xsd | Электронный контракт (малая закупка) |
| `cpmProcedureCancel` | fcsExtegration.xsd | Извещение об отмене процедуры заключения контракта (малая закупка) |
| `cpmProcedureCancel` | fcsIntegration.xsd | Пакет данных:Извещение об отмене процедуры заключения контракта (малая закупка) |
| `cpmProcedureCancel` | fcsPrintForm.xsd | Извещение об отмене процедуры заключения контракта (малая закупка) |
| `cpmProtocolDisagreements` | fcsIntegration.xsd | Пакет данных:Протокол разногласий (малая закупка) |
| `cpmProtocolDisagreements` | lkp-eisPrintForm.xsd | Протокол разногласий (малая закупка). Не применяется, добавлено на развитие |
| `cpmRefusalConcludeContract` | fcsIntegration.xsd | Пакет данных:Отказ участника закупки от заключения контракта (малая закупка) |
| `cpmRefusalConcludeContract` | lkp-eisPrintForm.xsd | Отказ участника закупки от заключения контракта (малая закупка) |
| `cpNoticeDeviation` | fcsIntegration.xsd | Пакет данных:Уведомление об уклонении от заключения контракта |
| `cpNoticeDeviation` | fcsPrintForm.xsd | Уведомление об уклонении от заключения контракта |
| `cpNoticeEvasion` | fcsIntegration.xsd | Пакет данных:Уведомление об отказе от заключения контракта. Устарело, не применяется |
| `cpNoticeEvasion` | fcsPrintForm.xsd | Уведомление об отказе от заключения контракта. Устарело, не применяется |
| `cpProcedureCancel` | fcsExtegration.xsd | Проект извещения об отмене процедуры заключения контракта |
| `cpProcedureCancel` | fcsIntegration.xsd | Пакет данных:Извещение об отмене процедуры заключения контракта |
| `cpProcedureCancel` | fcsPrintForm.xsd | Извещение об отмене процедуры заключения контракта |
| `cpProcedureCancelFailure` | fcsIntegration.xsd | Пакет данных:Отмена извещения об отмене процедуры заключения контракта |
| `cpProcedureCancelLKP` | fcsExtegration.xsd | Извещение об отмене процедуры заключения контракта для взаимодействия с ЛКП |
| `cpProcedureCancelLKP` | fcsIntegration.xsd | Пакет данных:Извещение об отмене процедуры заключения контракта для взаимодействия с ЛКП |
| `cpProcedureCancelLKP` | fcsPrintForm.xsd | Извещение об отмене процедуры заключения контракта для взаимодействия с ЛКП |
| `cpProtocolDelta` | fcsIntegration.xsd | Пакет данных:Протокол изменений электронного контракта |
| `cpProtocolDisagreements` | fcsIntegration.xsd | Пакет данных:Протокол разногласий |
| `cpProtocolDisagreements` | fcsPrintForm.xsd | Протокол разногласий |
| `cpProtocolDisagreementsLKP` | fcsIntegration.xsd | Пакет данных:Протокол разногласий для взаимодействия с ЛКП |
| `cpProtocolDisagreementsLKP` | lkp-eisPrintForm.xsd | Протокол разногласий для взаимодействия с ЛКП |
| `cpRefusalConcludeContract` | fcsIntegration.xsd | Пакет данных:Отказ участника закупки от заключения контракта |
| `cpRefusalConcludeContract` | fcsPrintForm.xsd | Отказ участника закупки от заключения контракта |
| `cpRefusalConcludeContractLKP` | lkp-eisPrintForm.xsd | Отказ участника закупки от заключения контракта для взаимодействия с ЛКП |
| `customerConsentForRMIS` | fcsPrintForm.xsd | Cогласие заказчика на предоставление РИС информации и документов (для формирования печатной формы) |
| `elActSpendingFundsInfo` | lkp-eisPrintForm.xsd | Сведения о направлениях расходования средств |
| `elActUnstructuredCustomerTitle` | lkp-eisPrintForm.xsd | Документ о приемке в неструктурированной форме (информация заказчика) |
| `elActUnstructuredSupplierTitle` | lkp-eisPrintForm.xsd | Документ о приемке в неструктурированной форме (информация поставщика) |
| `electronicComplaint` | fcsIntegration.xsd | Пакет данных:Информация по жалобе, поданной в электронном виде |
| `electronicComplaint` | fcsPrintForm.xsd | Информация по жалобе, поданной в электронном виде для ИС КО |
| `epClarificationDoc` | fcsExtegration.xsd | Проект разъяснений положений извещения об осуществлении закупки |
| `epClarificationDoc` | fcsIntegration.xsd | Пакет данных:Разъяснения положений извещения об осуществлении закупки |
| `epClarificationDoc` | fcsPrintForm.xsd | Разъяснения положений извещения об осуществлении закупки |
| `epClarificationDocRequest` | fcsIntegration.xsd | Пакет данных:Запрос о даче разъяснений положений извещения об осуществлении закупки |
| `epClarificationDocRequest` | fcsPrintForm.xsd | Запрос о даче разъяснений положений извещения об осуществлении закупки |
| `epClarificationResult` | fcsExtegration.xsd | Проект разъяснения результатов |
| `epClarificationResult` | fcsIntegration.xsd | Пакет данных:Разъяснение результатов (не применяется для СОП EF2020, EOK2020, EZK2020, EZT2020) |
| `epClarificationResult` | fcsPrintForm.xsd | Разъяснения положений извещения об осуществлении закупки |
| `epClarificationResultRequest` | fcsIntegration.xsd | Пакет данных:Запрос о даче разъяснений результатов (не применяется для СОП EF2020, EOK2020, EZK2020, EZT2020) |
| `epClarificationResultRequest` | fcsPrintForm.xsd | Запрос о даче разъяснений результатов |
| `epClosedInvitationEZakA2020` | fcsExtegration.xsd | Проект приглашения принять участие в закупке ЭЗакА20 (закрытый аукцион в электронной форме c даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `epClosedInvitationEZakA2020` | fcsIntegration.xsd | Пакет данных:Приглашение принять участие в закупке ЭЗакА20 (закрытый аукцион в электронной форме c даты начала действия оптимизационного законопроекта 44-ФЗ); изменение извещения |
| `epClosedInvitationEZakA2020` | fcsPrintForm.xsd | Приглашение принять участие в закупке ЭЗакА20 (закрытый аукцион в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `epClosedInvitationEZakK2020` | fcsExtegration.xsd | Проект приглашения принять участие в закупке ЭЗакК20 (закрытый конкурс в электронной форме c даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `epClosedInvitationEZakK2020` | fcsIntegration.xsd | Пакет данных:Приглашение принять участие в закупке ЭЗакК20 (закрытый конкурс в электронной форме c даты начала действия оптимизационного законопроекта 44-ФЗ); изменение извещения |
| `epClosedInvitationEZakK2020` | fcsPrintForm.xsd | Приглашение принять участие в закупке ЭЗакК20 (закрытый конкурс в электронной форме с 01.07.2021 года с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `epClosedNoticeApplicationCancel` | fcsIntegration.xsd | Пакет данных:Уведомление об отзыве заявки участником (закрытые электронные процедуры) |
| `epClosedNoticeApplicationCancel` | fcsPrintForm.xsd | Уведомление об отзыве заявки участником (закрытые электронные процедуры) |
| `epClosedNotificationCancel` | fcsExtegration.xsd | Проект извещения об отмене определения поставщика (подрядчика, исполнителя) в электронной форме (закрытые электронные процедуры) |
| `epClosedNotificationCancel` | fcsIntegration.xsd | Пакет данных:Извещение об отмене определения поставщика (подрядчика, исполнителя) в электронной форме (закрытые электронные процедуры) |
| `epClosedNotificationCancel` | fcsPrintForm.xsd | Извещение об отмене определения поставщика (подрядчика, исполнителя) в электронной форме (закрытые электронные процедуры) |
| `epClosedNotificationCancelFailure` | fcsExtegration.xsd | Проект отмены извещения об отмене определения поставщика (подрядчика, исполнителя) в электронной форме (закрытые электронные процедуры) |
| `epClosedNotificationCancelFailure` | fcsIntegration.xsd | Пакет данных:Отмена извещения об отмене определения поставщика (подрядчика, исполнителя) в электронной форме (закрытые электронные процедуры) |
| `epClosedNotificationCancelFailure` | fcsPrintForm.xsd | Отмена извещения об отмене определения поставщика (подрядчика, исполнителя) в электронной форме (закрытые электронные процедуры) |
| `epClosedNotificationOrgChange` | fcsIntegration.xsd | Пакет данных:Уведомление об изменении организации, осуществляющей закупку (закрытые электронные процедуры) |
| `epClosedNotificationOrgChange` | fcsPrintForm.xsd | Уведомление об изменении организации, осуществляющей закупку (закрытые электронные процедуры) |
| `epClosedPlacementResult` | fcsIntegration.xsd | Пакет данных:Результат проведения процедуры определения поставщика (закрытые электронные процедуры) |
| `epClosedPlacementResult` | fcsPrintForm.xsd | Результат проведения процедуры определения поставщика (закрытые электронные процедуры) |
| `epClosedProtocolCancel` | fcsExtegration.xsd | Проект отмены протокола электронной процедуры (закрытые электронные процедуры) |
| `epClosedProtocolCancel` | fcsIntegration.xsd | Пакет данных:Информация об отмене протокола электронной процедуры (закрытые электронные процедуры) |
| `epClosedProtocolCancel` | fcsPrintForm.xsd | Информация об отмене протокола электронной процедуры (закрытые электронные процедуры) |
| `epClosedProtocolDeviation` | fcsExtegration.xsd | Проект протокола признания участника уклонившимся от заключения контракта c даты начала действия оптимизационного законопроекта 44-ФЗ (закрытые электронные процедуры) |
| `epClosedProtocolDeviation` | fcsIntegration.xsd | Пакет данных:Протокол признания участника уклонившимся от заключения контракта c даты начала действия оптимизационного законопроекта 44-ФЗ (закрытые электронные процедуры) |
| `epClosedProtocolDeviation` | fcsPrintForm.xsd | Протокол признания участника уклонившимся от заключения контракта с даты начала действия оптимизационного законопроекта 44-ФЗ (закрытые электронные процедуры) |
| `epClosedProtocolEvasion` | fcsExtegration.xsd | Проект протокола об отказе от заключения контракта c даты начала действия оптимизационного законопроекта 44-ФЗ (закрытые электронные процедуры) |
| `epClosedProtocolEvasion` | fcsIntegration.xsd | Пакет данных:Протокол об отказе от заключения контракта c даты начала действия оптимизационного законопроекта 44-ФЗ (закрытые электронные процедуры) |
| `epClosedProtocolEvasion` | fcsPrintForm.xsd | Протокол об отказе от заключения контракта с даты начала действия оптимизационного законопроекта 44-ФЗ (закрытые электронные процедуры) |
| `epClosedProtocolEvDevCancel` | fcsExtegration.xsd | Проект информации об отмене протокола для ПОК/ППУ c даты начала действия оптимизационного законопроекта 44-ФЗ (закрытые электронные процедуры) |
| `epClosedProtocolEvDevCancel` | fcsIntegration.xsd | Пакет данных:Информация об отмене протокола ПОК/ППУ c даты начала действия оптимизационного законопроекта 44-ФЗ (закрытые электронные процедуры) |
| `epClosedProtocolEvDevCancel` | fcsPrintForm.xsd | Информация об отмене протокола ПОК/ППУ с даты начала действия оптимизационного законопроекта 44-ФЗ (закрытые электронные процедуры) |
| `epClosedProtocolEZakA2020DocRequest` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения запросов на представление документации о закупке в ЭЗакА20 (закрытый аукцион в электронной форме c даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `epClosedProtocolEZakA2020DocRequest` | fcsPrintForm.xsd | Протокол рассмотрения запросов на представление документации о закупке в ЭЗакА20 (закрытый аукцион в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `epClosedProtocolEZakA2020Final` | fcsIntegration.xsd | Пакет данных:Протокол подведения итогов определения поставщика (подрядчика, исполнителя) в ЭЗакА20 (закрытый аукцион в электронной форме c даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `epClosedProtocolEZakA2020Final` | fcsPrintForm.xsd | Протокол подведения итогов определения поставщика (подрядчика, исполнителя) в ЭЗакА20 (закрытый аукцион в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `epClosedProtocolEZakK2020DocRequest` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения запросов на представление документации о закупке в ЭЗакК20 (закрытый конкурс в электронной форме c даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `epClosedProtocolEZakK2020DocRequest` | fcsPrintForm.xsd | Протокол рассмотрения запросов на представление документации о закупке в ЭЗакК20 (закрытый конкурс в электронной форме с 01.07.2021 года) |
| `epClosedProtocolEZakK2020Final` | fcsIntegration.xsd | Пакет данных:Протокол подведения итогов определения поставщика (подрядчика, исполнителя) в ЭЗакК20 (закрытый конкурс в электронной формеc даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `epClosedProtocolEZakK2020Final` | fcsPrintForm.xsd | Протокол подведения итогов определения поставщика (подрядчика, исполнителя) в ЭЗакК20 (закрытый конкурс в электронной форме с 01.07.2021 года) |
| `epmNoticeApplicationsAbsenceEZM` | fcsIntegration.xsd | Пакет данных:Уведомление об отсутствии заявок (ЭМЗ) |
| `epmNoticeApplicationsAbsenceEZM` | fcsPrintForm.xsd | Уведомление об отсутствии заявок (ЭМЗ) |
| `epmNotificationCancelEMZ` | fcsIntegration.xsd | Пакет данных:Извещение об отмене определения поставщика (подрядчика, исполнителя) в электронной форме (ЭМЗ) |
| `epmNotificationCancelEMZ` | fcsPrintForm.xsd | Извещение об отмене определения поставщика (подрядчика, исполнителя) в электронной форме (ЭМЗ) |
| `epmNotificationCancelFailureEMZ` | fcsIntegration.xsd | Пакет данных:Отмена извещения об отмене определения поставщика (подрядчика, исполнителя) в электронной форме (ЭМЗ) |
| `epmNotificationCancelFailureEMZ` | fcsPrintForm.xsd | Отмена извещения об отмене определения поставщика (подрядчика, исполнителя) в электронной форме (ЭМЗ) |
| `epmNotificationEMZ` | fcsIntegration.xsd | Пакет данных:Извещение о проведении ЭМЗ (Закупка у единственного поставщика по пункту 4, 5 части 1 статьи 93 Закона № 44-ФЗ) |
| `epmNotificationEMZ` | fcsPrintForm.xsd | Извещение о проведении ЭМЗ (Закупка у единственного поставщика по пункту 4, 5 части 1 статьи 93 Закона № 44-ФЗ) |
| `epmProtocolCancelEMZ` | fcsIntegration.xsd | Пакет данных:Информация об отмене протокола электронной процедуры (ЭМЗ) |
| `epmProtocolCancelEMZ` | fcsPrintForm.xsd | Информация об отмене протокола электронной процедуры (ЭМЗ) |
| `epmProtocolEMZFinal` | fcsPrintForm.xsd | Протокол подведения итогов определения поставщика (подрядчика, исполнителя) ЭМЗ (Закупка у единственного поставщика по пункту 4, 5 части 1 статьи 93 Закона № 44-ФЗ) |
| `epmProtocolEMZFinalPart` | fcsIntegration.xsd | Пакет данных:Протокол подведения итогов определения поставщика (подрядчика, исполнителя) ЭМЗ (Закупка у единственного поставщика по пункту 4, 5 части 1 статьи 93 Закона № 44-ФЗ) с информацией об участниках |
| `epmProtocolEMZFinalPart` | fcsPrintForm.xsd | Протокол подведения итогов определения поставщика (подрядчика, исполнителя) ЭМЗ (Закупка у единственного поставщика по пункту 4, 5 части 1 статьи 93 Закона № 44-ФЗ) с информацией об участниках |
| `epmProtocolEvasion` | fcsIntegration.xsd | Пакет данных:Протокол об отказе от заключения контракта (ЭМЗ) |
| `epmProtocolEvasion` | fcsPrintForm.xsd | Протокол об отказе от заключения контракта (ЭМЗ) |
| `epmProtocolEvCancel` | fcsIntegration.xsd | Пакет данных: Информация об отмене протокола ПОК (ЭМЗ) |
| `epmProtocolEvCancel` | fcsPrintForm.xsd | Информация об отмене протокола ПОК (ЭМЗ) |
| `epmTransferDocument` | fcsIntegration.xsd | Пакет данных:Транспортный документ для закупки у единственного поставщика по пункту 4, 5 части 1 статьи 93 Закона № 44-ФЗ (ЭМЗ) |
| `epNoticeApplicationCancel` | fcsIntegration.xsd | Пакет данных:Уведомление об отзыве заявки участником |
| `epNoticeApplicationCancel` | fcsPrintForm.xsd | Уведомление об отзыве заявки участником |
| `epNoticeApplicationsAbsence` | fcsIntegration.xsd | Пакет данных:Уведомление об отсутствии заявок |
| `epNoticeApplicationsAbsence` | fcsPrintForm.xsd | Уведомление об отсутствии заявок |
| `epNotificationCancel` | fcsExtegration.xsd | Проект извещения об отмене определения поставщика (подрядчика, исполнителя) в электронной форме |
| `epNotificationCancel` | fcsIntegration.xsd | Пакет данных:Извещение об отмене определения поставщика (подрядчика, исполнителя) в электронной форме |
| `epNotificationCancel` | fcsPrintForm.xsd | Извещение об отмене определения поставщика (подрядчика, исполнителя) в электронной форме |
| `epNotificationCancelFailure` | fcsExtegration.xsd | Проект отмены извещения об отмене определения поставщика (подрядчика, исполнителя) в электронной форме |
| `epNotificationCancelFailure` | fcsIntegration.xsd | Пакет данных:Отмена извещения об отмене определения поставщика (подрядчика, исполнителя) в электронной форме |
| `epNotificationCancelFailure` | fcsPrintForm.xsd | Отмена извещения об отмене определения поставщика (подрядчика, исполнителя) в электронной форме |
| `epNotificationEF2020` | fcsExtegration.xsd | Проект извещения о проведении ЭА20 (аукцион в электронной форме c даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `epNotificationEF2020` | fcsIntegration.xsd | Пакет данных:Извещение о проведении ЭА20 (аукцион в электронной форме c даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `epNotificationEF2020` | fcsPrintForm.xsd | Извещение о проведении ЭА20 (аукцион в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `epNotificationEOK` | fcsExtegration.xsd | Проект извещения о проведении ЭOK |
| `epNotificationEOK` | fcsIntegration.xsd | Пакет данных:Извещение о проведении ЭOK |
| `epNotificationEOK` | fcsPrintForm.xsd | Извещение о проведении ЭOK с конкурсной документацией |
| `epNotificationEOK2020` | fcsExtegration.xsd | Проект извещения о проведении ЭОК20 (открытый конкурс в электронной формеc даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `epNotificationEOK2020` | fcsIntegration.xsd | Пакет данных:Извещение о проведении ЭОК20 (открытый конкурс в электронной форме c даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `epNotificationEOK2020` | fcsPrintForm.xsd | Извещение о проведении ЭОК20 (открытый конкурс в электронной форме) c даты начала действия оптимизационного законопроекта 44-ФЗ |
| `epNotificationEOKD` | fcsExtegration.xsd | Проект извещения о проведении ЭOKД |
| `epNotificationEOKD` | fcsIntegration.xsd | Пакет данных:Извещение о проведении ЭOKД |
| `epNotificationEOKD` | fcsPrintForm.xsd | Извещение о проведении ЭOKД с конкурсной документацией |
| `epNotificationEOKDPF` | fcsPrintForm.xsd | Извещение о проведении ЭOKД |
| `epNotificationEOKOU` | fcsExtegration.xsd | Проект извещения о проведении ЭOK-ОУ |
| `epNotificationEOKOU` | fcsIntegration.xsd | Пакет данных:Извещение о проведении ЭOK-ОУ |
| `epNotificationEOKOU` | fcsPrintForm.xsd | Извещение о проведении ЭOK-ОУ с конкурсной документацией |
| `epNotificationEOKOUPF` | fcsPrintForm.xsd | Извещение о проведении ЭOK-ОУ |
| `epNotificationEOKPF` | fcsPrintForm.xsd | Извещение о проведении ЭOK |
| `epNotificationEZakA` | fcsExtegration.xsd | Проект извещения о проведении ЭЗакА |
| `epNotificationEZakA` | fcsIntegration.xsd | Пакет данных:Извещение о проведении ЭЗакА |
| `epNotificationEZakA` | fcsPrintForm.xsd | Извещение о проведении ЭЗакА |
| `epNotificationEZakK` | fcsExtegration.xsd | Проект извещения о проведении ЭЗакК |
| `epNotificationEZakK` | fcsIntegration.xsd | Пакет данных:Извещение о проведении ЭЗакК |
| `epNotificationEZakK` | fcsPrintForm.xsd | Извещение о проведении ЭЗакК |
| `epNotificationEZakKD` | fcsExtegration.xsd | Проект извещения о проведении ЭЗакКД |
| `epNotificationEZakKD` | fcsIntegration.xsd | Пакет данных:Извещение о проведении ЭЗакКД |
| `epNotificationEZakKD` | fcsPrintForm.xsd | Извещение о проведении ЭЗакКД |
| `epNotificationEZakKOU` | fcsExtegration.xsd | Проект извещения о проведении ЭЗакК-ОУ |
| `epNotificationEZakKOU` | fcsIntegration.xsd | Пакет данных:Извещение о проведении ЭЗакК-ОУ |
| `epNotificationEZakKOU` | fcsPrintForm.xsd | Извещение о проведении ЭЗакК-ОУ |
| `epNotificationEZK` | fcsExtegration.xsd | Проект извещения о проведении ЭЗК |
| `epNotificationEZK` | fcsIntegration.xsd | Пакет данных:Извещение о проведении ЭЗК |
| `epNotificationEZK` | fcsPrintForm.xsd | Извещение о проведении ЭЗК |
| `epNotificationEZK2020` | fcsExtegration.xsd | Проект извещения о проведении ЭЗК20 (запрос котировок в электронной форме c 01.04.2021 года) |
| `epNotificationEZK2020` | fcsIntegration.xsd | Пакет данных:Извещение о проведении ЭЗК20 (запрос котировок в электронной форме c 01.04.2021 года) |
| `epNotificationEZK2020` | fcsPrintForm.xsd | Извещение о проведении ЭЗК20 (запрос котировок в электронной форме c 01.04.2021 года) |
| `epNotificationEZP` | fcsExtegration.xsd | Проект извещения о проведении ЭЗП |
| `epNotificationEZP` | fcsIntegration.xsd | Пакет данных:Извещение о проведении ЭЗП |
| `epNotificationEZP` | fcsPrintForm.xsd | Извещение о проведении ЭЗП с конкурсной документацией |
| `epNotificationEZPPF` | fcsPrintForm.xsd | Извещение о проведении ЭЗП |
| `epNotificationEZT2020` | fcsExtegration.xsd | Проект извещения о проведении ЭЗТ (Закупка товаров согласно ч.12 ст. 93 № 44-ФЗ) |
| `epNotificationEZT2020` | fcsIntegration.xsd | Пакет данных:Извещение о проведении ЭЗТ (Закупка товаров согласно ч.12 ст. 93 № 44-ФЗ) |
| `epNotificationEZT2020` | fcsPrintForm.xsd | Извещение о проведении ЭЗТ (Закупка товаров согласно ч.12 ст. 93 № 44-ФЗ) |
| `epNotificationMFO` | fcsPrintForm.xsd | Извещение о закупке в рамках российских проектов, финансируемых за счет средств займов МФО |
| `epPreliminaryOffer` | fcsIntegration.xsd | Пакет данных:Предварительное предложение; внесение изменений в предварительное предложение |
| `epProlongationCancelEOK` | fcsExtegration.xsd | Отмена извещения о продлении срока подачи заявок на участие в ЭOK |
| `epProlongationCancelEOK` | fcsIntegration.xsd | Пакет данных:Отмена извещения о продлении срока подачи заявок на участие в ЭOK |
| `epProlongationCancelEOK` | fcsPrintForm.xsd | Отмена извещения о продлении срока подачи заявок на участие в ЭOK |
| `epProlongationCancelEOKD` | fcsExtegration.xsd | Отмена извещения о продлении срока подачи заявок на участие в ЭOKД |
| `epProlongationCancelEOKD` | fcsIntegration.xsd | Пакет данных:Отмена извещения о продлении срока подачи заявок на участие в ЭOKД |
| `epProlongationCancelEOKD` | fcsPrintForm.xsd | Отмена извещения о продлении срока подачи заявок на участие в ЭOKД |
| `epProlongationCancelEOKOU` | fcsExtegration.xsd | Отмена извещения о продлении срока подачи заявок на участие в ЭOK-ОУ |
| `epProlongationCancelEOKOU` | fcsIntegration.xsd | Пакет данных:Отмена извещения о продлении срока подачи заявок на участие в ЭOK-ОУ |
| `epProlongationCancelEOKOU` | fcsPrintForm.xsd | Отмена извещения о продлении срока подачи заявок на участие в ЭOK-ОУ |
| `epProlongationCancelEZK` | fcsExtegration.xsd | Отмена извещения о продлении срока подачи заявок на участие в ЭЗK |
| `epProlongationCancelEZK` | fcsIntegration.xsd | Пакет данных:Отмена извещения о продлении срока подачи заявок на участие в в ЭЗК |
| `epProlongationCancelEZK` | fcsPrintForm.xsd | Отмена извещения о продлении срока подачи заявок на участие в ЭЗK |
| `epProlongationEOK` | fcsExtegration.xsd | Проект извещения о продлении срока подачи заявок на участие в ЭOK |
| `epProlongationEOK` | fcsIntegration.xsd | Пакет данных:Извещение о продлении срока подачи заявок на участие в ЭOK |
| `epProlongationEOK` | fcsPrintForm.xsd | Извещение о продлении срока подачи заявок на участие в ЭOK |
| `epProlongationEOKD` | fcsExtegration.xsd | Проект извещения о продлении срока подачи заявок на участие в ЭOKД |
| `epProlongationEOKD` | fcsIntegration.xsd | Пакет данных:Извещение о продлении срока подачи заявок на участие в ЭOKД |
| `epProlongationEOKD` | fcsPrintForm.xsd | Извещение о продлении срока подачи заявок на участие в ЭOKД |
| `epProlongationEOKOU` | fcsExtegration.xsd | Проект извещения о продлении срока подачи заявок на участие в ЭOK-ОУ |
| `epProlongationEOKOU` | fcsIntegration.xsd | Пакет данных:Извещение о продлении срока подачи заявок на участие в ЭOK-ОУ |
| `epProlongationEOKOU` | fcsPrintForm.xsd | Извещение о продлении срока подачи заявок на участие в ЭOK-ОУ |
| `epProlongationEZK` | fcsExtegration.xsd | Проект извещения о продлении срока подачи заявок на участие в ЭЗК |
| `epProlongationEZK` | fcsIntegration.xsd | Пакет данных:Извещение о продлении срока подачи заявок на участие в ЭЗК |
| `epProlongationEZK` | fcsPrintForm.xsd | Извещение о продлении срока подачи заявок на участие в ЭЗК |
| `epProtocolCancel` | fcsIntegration.xsd | Пакет данных:Информация об отмене протокола электронной процедуры |
| `epProtocolCancel` | fcsPrintForm.xsd | Информация об отмене протокола электронной процедуры |
| `epProtocolDeviation` | fcsExtegration.xsd | Проект протокола признания участника уклонившимся от заключения контракта с 01.04.2021 |
| `epProtocolDeviation` | fcsIntegration.xsd | Пакет данных:Протокол признания участника уклонившимся от заключения контракта с 01.04.2021 |
| `epProtocolDeviation` | fcsPrintForm.xsd | Протокол признания участника уклонившимся от заключения контракта с 01.04.2021 |
| `epProtocolEF2020Final` | fcsPrintForm.xsd | Протокол подведения итогов определения поставщика (подрядчика, исполнителя) ЭА20 (аукцион в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `epProtocolEF2020FinalPart` | fcsIntegration.xsd | Пакет данных:Протокол подведения итогов определения поставщика (подрядчика, исполнителя) ЭА20 (аукцион в электронной форме c даты начала действия оптимизационного законопроекта 44-ФЗ) с информацией об участниках |
| `epProtocolEF2020FinalPart` | fcsPrintForm.xsd | Протокол подведения итогов определения поставщика (подрядчика, исполнителя) ЭА20 (аукцион в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ с информацией об участниках |
| `epProtocolEF2020SubmitOffers` | fcsIntegration.xsd | Пакет данных:Протокол подачи ценовых предложений ЭА20 (аукцион в электронной форме c даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `epProtocolEF2020SubmitOffers` | fcsPrintForm.xsd | Протокол подачи ценовых предложений ЭА20 (аукцион в электронной форме с даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `epProtocolEOK1` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения и оценки первых частей заявок на участие в ЭOK |
| `epProtocolEOK1` | fcsPrintForm.xsd | Протокол рассмотрения и оценки первых частей заявок на участие в ЭOK |
| `epProtocolEOK2` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения и оценки вторых частей заявок на участие в ЭOK |
| `epProtocolEOK2` | fcsPrintForm.xsd | Протокол рассмотрения и оценки вторых частей заявок на участие в ЭOK |
| `epProtocolEOK2020Final` | fcsPrintForm.xsd | Протокол подведения итогов ЭOK20 (открытый конкурс в электронной форме) с даты начала действия оптимизационного законопроекта 44-ФЗ |
| `epProtocolEOK2020FinalPart` | fcsIntegration.xsd | Пакет данных:Протокол подведения итогов ЭOK20 (открытый конкурс в электронной форме c даты начала действия оптимизационного законопроекта 44-ФЗ) с информацией об участниках |
| `epProtocolEOK2020FinalPart` | fcsPrintForm.xsd | Протокол подведения итогов ЭOK20 (открытый конкурс в электронной форме) с даты начала действия оптимизационного законопроекта 44-ФЗ с информацией об участниках |
| `epProtocolEOK2020FirstSections` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения и оценки первых частей заявок на участие в ЭOK20 (открытый конкурс в электронной форме c даты начала действия оптимизационного законопроекта 44-ФЗ) |
| `epProtocolEOK2020FirstSections` | fcsPrintForm.xsd | Протокол рассмотрения и оценки первых частей заявок на участие в ЭOK20 (открытый конкурс в электронной форме) с даты начала действия оптимизационного законопроекта 44-ФЗ |
| `epProtocolEOK2020SecondSections` | fcsPrintForm.xsd | Протокол рассмотрения и оценки вторых частей заявок на участие в ЭOK20 (открытый конкурс в электронной форме) с даты начала действия оптимизационного законопроекта 44-ФЗ |
| `epProtocolEOK2020SecondSectionsPart` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения и оценки вторых частей заявок на участие в ЭOK20 (открытый конкурс в электронной форме c даты начала действия оптимизационного законопроекта 44-ФЗ) с информацией об участниках |
| `epProtocolEOK2020SecondSectionsPart` | fcsPrintForm.xsd | Протокол рассмотрения и оценки вторых частей заявок на участие в ЭOK20 (открытый конкурс в электронной форме) с даты начала действия оптимизационного законопроекта 44-ФЗ с информацией об участниках |
| `epProtocolEOK3` | fcsIntegration.xsd | Пакет данных:Протокол подведения итогов ЭOK |
| `epProtocolEOK3` | fcsPrintForm.xsd | Протокол подведения итогов ЭOK |
| `epProtocolEOKD1` | fcsIntegration.xsd | Пакет данных:Протокол первого этапа ЭOKД |
| `epProtocolEOKD1` | fcsPrintForm.xsd | Протокол первого этапа ЭOKД |
| `epProtocolEOKD2` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения и оценки первых частей заявок на участие в ЭOKД |
| `epProtocolEOKD2` | fcsPrintForm.xsd | Протокол рассмотрения и оценки первых частей заявок на участие в ЭOKД |
| `epProtocolEOKD3` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения и оценки вторых частей заявок на участие в ЭOKД |
| `epProtocolEOKD3` | fcsPrintForm.xsd | Протокол рассмотрения и оценки вторых частей заявок на участие в ЭOKД |
| `epProtocolEOKD4` | fcsIntegration.xsd | Пакет данных:Протокол подведения итогов ЭOKД |
| `epProtocolEOKD4` | fcsPrintForm.xsd | Протокол подведения итогов ЭOKД |
| `epProtocolEOKDSingleApp` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения единственной заявки на участие ЭOKД |
| `epProtocolEOKDSingleApp` | fcsPrintForm.xsd | Протокол рассмотрения единственной заявки на участие ЭOKД |
| `epProtocolEOKDSinglePart` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения заявки единственного участника ЭOKД |
| `epProtocolEOKDSinglePart` | fcsPrintForm.xsd | Протокол рассмотрения заявки единственного участника ЭOKД |
| `epProtocolEOKOU1` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения и оценки первых частей заявок на участие в ЭOK-ОУ |
| `epProtocolEOKOU1` | fcsPrintForm.xsd | Протокол рассмотрения и оценки первых частей заявок на участие в ЭOK-ОУ |
| `epProtocolEOKOU2` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения и оценки вторых частей заявок на участие в ЭOK-ОУ |
| `epProtocolEOKOU2` | fcsPrintForm.xsd | Протокол рассмотрения и оценки вторых частей заявок на участие в ЭOK-ОУ |
| `epProtocolEOKOU3` | fcsIntegration.xsd | Пакет данных:Протокол подведения итогов ЭOK-ОУ |
| `epProtocolEOKOU3` | fcsPrintForm.xsd | Протокол подведения итогов ЭOK-ОУ |
| `epProtocolEOKOUSingleApp` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения единственной заявки на участие ЭOK-ОУ |
| `epProtocolEOKOUSingleApp` | fcsPrintForm.xsd | Протокол рассмотрения единственной заявки на участие ЭOK-ОУ |
| `epProtocolEOKOUSinglePart` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения заявки единственного участника ЭOK-ОУ |
| `epProtocolEOKOUSinglePart` | fcsPrintForm.xsd | Протокол рассмотрения заявки единственного участника ЭOK-ОУ |
| `epProtocolEOKSingleApp` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения единственной заявки на участие ЭOK |
| `epProtocolEOKSingleApp` | fcsPrintForm.xsd | Протокол рассмотрения единственной заявки на участие ЭOK |
| `epProtocolEOKSinglePart` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения заявки единственного участника ЭOK |
| `epProtocolEOKSinglePart` | fcsPrintForm.xsd | Протокол рассмотрения заявки единственного участника ЭOK |
| `epProtocolEvasion` | fcsExtegration.xsd | Проект протокола об отказе от заключения контракта с 01.04.2021 |
| `epProtocolEvasion` | fcsIntegration.xsd | Пакет данных:Протокол об отказе от заключения контракта с 01.04.2021 |
| `epProtocolEvasion` | fcsPrintForm.xsd | Протокол об отказе от заключения контракта с 01.04.2021 |
| `epProtocolEvDevCancel` | fcsExtegration.xsd | Проект информации об отмене протокола для ПОК/ППУ с 01.04.2021 |
| `epProtocolEvDevCancel` | fcsIntegration.xsd | Пакет данных:Информация об отмене протокола ПОК/ППУ с 01.04.2021 |
| `epProtocolEvDevCancel` | fcsPrintForm.xsd | Информация об отмене протокола ПОК/ППУ с 01.04.2021 |
| `epProtocolEZK1` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения заявок на участие в ЭЗК |
| `epProtocolEZK1` | fcsPrintForm.xsd | Протокол рассмотрения заявок на участие в ЭЗК |
| `epProtocolEZK2` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения и оценки заявок на участие в ЭЗК |
| `epProtocolEZK2` | fcsPrintForm.xsd | Протокол рассмотрения и оценки заявок на участие в ЭЗК |
| `epProtocolEZK2020Final` | fcsPrintForm.xsd | Протокол подведения итогов определения поставщика (подрядчика, исполнителя) ЭЗК20 (запрос котировок в электронной форме c 01.04.2021 года) |
| `epProtocolEZK2020FinalPart` | fcsIntegration.xsd | Пакет данных:Протокол подведения итогов определения поставщика (подрядчика, исполнителя) ЭЗК20 (запрос котировок в электронной форме c 01.04.2021 года) с информацией об участниках |
| `epProtocolEZK2020FinalPart` | fcsPrintForm.xsd | Протокол подведения итогов определения поставщика (подрядчика, исполнителя) ЭЗК20 (запрос котировок в электронной форме c 01.04.2021 года) с информацией об участниках |
| `epProtocolEZP1` | fcsIntegration.xsd | Пакет данных:Протокол проведения ЭЗП |
| `epProtocolEZP1` | fcsPrintForm.xsd | Протокол проведения ЭЗП |
| `epProtocolEZP1Extract` | fcsIntegration.xsd | Пакет данных:Выписка из протокола проведения ЭЗП |
| `epProtocolEZP1Extract` | fcsPrintForm.xsd | Выписка из протокола проведения ЭЗП |
| `epProtocolEZP2` | fcsIntegration.xsd | Пакет данных:Итоговый протокол ЭЗП |
| `epProtocolEZP2` | fcsPrintForm.xsd | Итоговый протокол ЭЗП |
| `epProtocolEZT2020Final` | fcsPrintForm.xsd | Протокол подведения итогов определения поставщика ЭЗТ (Закупка товаров согласно ч.12 ст. 93 № 44-ФЗ). Применяется для извещений, первая версия которых размещена после даты начала действия оптимизационного законопроекта 44-ФЗ |
| `epProtocolEZT2020FinalPart` | fcsIntegration.xsd | Пакет данных:Протокол подведения итогов определения поставщика ЭЗТ (Закупка товаров согласно ч.12 ст. 93 № 44-ФЗ) с информацией об участниках |
| `epProtocolEZT2020FinalPart` | fcsPrintForm.xsd | Протокол подведения итогов определения поставщика ЭЗТ (Закупка товаров согласно ч.12 ст. 93 № 44-ФЗ) с информацией об участниках |
| `eventPlan` | fcsIntegration.xsd | Пакет данных: План контрольных мероприятий для ОВК |
| `eventPlan` | fcsPrintForm.xsd | План контрольных мероприятий для ИС ОВК |
| `eventResult` | fcsIntegration.xsd | Пакет данных: Результат контроля для ОВК |
| `eventResult` | fcsPrintForm.xsd | Результат контроля для ИС ОВК |
| `eventResultCancel` | fcsIntegration.xsd | Пакет данных: Информация об отмене результата контроля для ОВК |
| `eventResultCancel` | fcsPrintForm.xsd | Информация об отмене результата контроля для ИС ОВК |
| `export` | fcsExport.xsd | Схема данных подсистемы экспорта |
| `export` | QueueVBS\vbsExport.xsd | Схема данных подсистемы экспорта |
| `fcsAddInfo` | fcsPrintForm.xsd | Дополнительная информация: о непредоставлении участником закупки сведений о выгодоприобретателях либо о субподрядчиках, соисполнителях либо решение заказчика об одностороннем отказе от исполнения контракта |
| `fcsAddInfoInvalid` | fcsPrintForm.xsd | Информация о недедействительности дополнительной информации |
| `fcsAuditResult` | fcsPrintForm.xsd | Обобщенная информация о результатах деятельности органа аудита в сфере закупок |
| `fcsClarification` | fcsExtegration.xsd | Проект разъяснения положений документации |
| `fcsClarification` | fcsIntegration.xsd | Пакет данных: Разъяснение положений документации |
| `fcsClarification` | fcsPrintForm.xsd | Разъяснения положений документации |
| `fcsClarificationRequest` | fcsIntegration.xsd | Пакет данных: Запрос ЭП о даче разъяснений положений документации по 44-ФЗ |
| `fcsClarificationRequestInfo` | fcsPrintForm.xsd | Информация запроса о даче разъяснений положений документации об электронном аукционе |
| `fcsContractSign` | fcsIntegration.xsd | Пакет данных:Информация о подписании государственного/муниципального контракта на ЭП |
| `fcsCustomerReportBigProjectMonitoring` | fcsExtegration.xsd | Отчет по мониторингу реализации крупных проектов с государственным участием |
| `fcsCustomerReportBigProjectMonitoring` | fcsIntegration.xsd | Пакет данных:Отчет по мониторингу реализации крупных проектов с государственным участием |
| `fcsCustomerReportBigProjectMonitoring` | fcsPrintForm.xsd | Отчет по мониторингу реализации крупных проектов с государственным участие |
| `fcsCustomerReportBigProjectMonitoringInvalid` | fcsExtegration.xsd | Информация о недействительности сведений отчета по мониторингу реализации крупных проектов с государственным участием |
| `fcsCustomerReportBigProjectMonitoringInvalid` | fcsIntegration.xsd | Пакет данных:Информация о недействительности сведений отчета по мониторингу реализации крупных проектов с государственным участием |
| `fcsCustomerReportBigProjectMonitoringInvalid` | fcsPrintForm.xsd | Информация о недействительности сведений отчета по мониторингу реализации крупных проектов с государственным участие |
| `fcsCustomerReportContractExecution` | fcsExtegration.xsd | Отчет об исполнении контракта (результатах отдельного этапа исполнения контракта) |
| `fcsCustomerReportContractExecution` | fcsIntegration.xsd | Пакет данных:Отчет об исполнении контракта (результатах отдельного этапа исполнения контракта) |
| `fcsCustomerReportContractExecution` | fcsPrintForm.xsd | Отчет об исполнении контракта (результатах отдельного этапа исполнения контракта) |
| `fcsCustomerReportContractExecutionInvalid` | fcsExtegration.xsd | Информация о недействительности сведений отчета об исполнении контракта (результатах отдельного этапа исполнения контракта) |
| `fcsCustomerReportContractExecutionInvalid` | fcsIntegration.xsd | Пакет данных:Информация о недействительности сведений отчета об исполнении контракта (результатах отдельного этапа исполнения контракта) |
| `fcsCustomerReportContractExecutionInvalid` | fcsPrintForm.xsd | Информация о недействительности сведений отчета об исполнении контракта (результатах отдельного этапа исполнения контракта) |
| `fcsCustomerReportRusProductsPurchasesVolume` | fcsPrintForm.xsd | Отчет об объеме закупок российских товаров |
| `fcsCustomerReportRusProductsPurchasesVolumeInvalid` | fcsPrintForm.xsd | Информация о недействительности сведений отчета об объеме закупок у субъектов малого предпринимательства, социально ориентированных некоммерческих организаций |
| `fcsCustomerReportRusProductsWorksServicesVolume` | fcsIntegration.xsd | Пакет данных: Отчет об объеме закупок товаров российского происхождения, работ, услуг, соответственно выполняемых, оказываемых российскими гражданами, российскими юридическими лицами |
| `fcsCustomerReportRusProductsWorksServicesVolume` | fcsPrintForm.xsd | Отчет об объеме закупок товаров российского происхождения, работ, услуг, соответственно выполняемых, оказываемых российскими гражданами, российскими юридическими лицами |
| `fcsCustomerReportRusProductsWorksServicesVolumeInvalid` | fcsIntegration.xsd | Пакет данных: Информация о недействительности сведений отчета об объеме закупок товаров российского происхождения, работ, услуг, соответственно выполняемых, оказываемых российскими гражданами, российскими юридическими лицами |
| `fcsCustomerReportRusProductsWorksServicesVolumeInvalid` | fcsPrintForm.xsd | Информация о недействительности сведений отчета об объеме закупок товаров российского происхождения, работ, услуг, соответственно выполняемых, оказываемых российскими гражданами, российскими юридическими лицами |
| `fcsCustomerReportSingleContractor` | fcsExtegration.xsd | Отчет с обоснованием закупки у единственного поставщика (подрядчика, исполнителя) |
| `fcsCustomerReportSingleContractor` | fcsIntegration.xsd | Пакет данных:Отчет с обоснованием закупки у единственного поставщика (подрядчика, исполнителя) |
| `fcsCustomerReportSingleContractor` | fcsPrintForm.xsd | Отчет с обоснованием закупки у единственного поставщика (подрядчика, исполнителя) |
| `fcsCustomerReportSingleContractorInvalid` | fcsExtegration.xsd | Информация о недействительности сведений отчета с обоснованием закупки у единственного поставщика (подрядчика, исполнителя) |
| `fcsCustomerReportSingleContractorInvalid` | fcsIntegration.xsd | Пакет данных:Информация о недействительности сведений отчета с обоснованием закупки у единственного поставщика (подрядчика, исполнителя) |
| `fcsCustomerReportSingleContractorInvalid` | fcsPrintForm.xsd | Информация о недействительности сведений отчета с обоснованием закупки у единственного поставщика (подрядчика, исполнителя) |
| `fcsCustomerReportSmallScaleBusiness` | fcsExtegration.xsd | Отчет об объеме закупок у СМП (субъектов малого предпринимательства), СОНО (социально ориентированных некоммерческих организаций) |
| `fcsCustomerReportSmallScaleBusiness` | fcsIntegration.xsd | Пакет данных:Отчет об объеме закупок у СМП (субъектов малого предпринимательства), СОНО (социально ориентированных некоммерческих организаций) |
| `fcsCustomerReportSmallScaleBusiness` | fcsPrintForm.xsd | Отчет об объеме закупок у субъектов малого предпринимательства, социально ориентированных некоммерческих организаций |
| `fcsCustomerReportSmallScaleBusinessInvalid` | fcsExtegration.xsd | Информация о недействительности сведений отчета об объеме закупок у СМП (субъектов малого предпринимательства), СОНО (социально ориентированных некоммерческих организаций) |
| `fcsCustomerReportSmallScaleBusinessInvalid` | fcsIntegration.xsd | Пакет данных:Информация о недействительности сведений отчета об объеме закупок у СМП (субъектов малого предпринимательства), СОНО (социально ориентированных некоммерческих организаций) |
| `fcsCustomerReportSmallScaleBusinessInvalid` | fcsPrintForm.xsd | Информация о недействительности сведений отчета об объеме закупок у субъектов малого предпринимательства, социально ориентированных некоммерческих организаций |
| `fcsCustomerReportUnstructured` | fcsPrintForm.xsd | Отчет заказчика в неструктурированной форме и информация о его недействительности |
| `fcsDocProjectStatusRequest` | fcsIntegration.xsd | Пакет данных: Запрос информации о статусе размещения проектов документов |
| `fcsDocProjectStatusResponse` | fcsIntegration.xsd | Пакет данных:Ответ на запрос информации о статусе размещения проектов документов |
| `fcsLBO` | fcsExtegration.xsd | Сведения о лимитах бюджетных обязательств (ЛБО), загружаемых из региональных систем финансового учета |
| `fcsLimitsRequest` | fcsPrintForm.xsd | Сведения для проверки на соотвествие ЛБО |
| `fcsLimitsResponse` | fcsPrintForm.xsd | Протокол проверки на соответствие ЛБО |
| `fcsNotification111` | fcsExtegration.xsd | Проект извещения о проведении закупки способом определения поставщика (подрядчика, исполнителя), установленным Правительством Российской Федерации в соответствии со ст. 111 Федерального закона № 44-ФЗ |
| `fcsNotification111` | fcsIntegration.xsd | Пакет данных: Извещение о проведении закупки способом определения поставщика (подрядчика, исполнителя), установленным Правительством Российской Федерации в соответствии со ст. 111 Федерального закона № 44-ФЗ |
| `fcsNotificationCancel` | fcsExtegration.xsd | Проект извещения об отмене определения поставщика (подрядчика, исполнителя) |
| `fcsNotificationCancel` | fcsIntegration.xsd | Пакет данных:Извещение об отмене определения поставщика (подрядчика, исполнителя) |
| `fcsNotificationCancel` | fcsPrintForm.xsd | Извещениe об отмене определения поставщика (подрядчика, исполнителя) |
| `fcsNotificationCancelFailure` | fcsExtegration.xsd | Проект отмены извещения об отмене определения поставщика (подрядчика, исполнителя) (в части лота); |
| `fcsNotificationCancelFailure` | fcsIntegration.xsd | Пакет данных:Отмена извещения об отмене определения поставщика (подрядчика, исполнителя) (в части лота); |
| `fcsNotificationCancelFailure` | fcsPrintForm.xsd | Отмена извещения об отмене определения поставщика (подрядчика, исполнителя) (в части лота); |
| `fcsNotificationEF` | fcsExtegration.xsd | Проект извещения о проведении ЭА (электронный аукцион); внесение изменений |
| `fcsNotificationEF` | fcsIntegration.xsd | Пакет данных: Извещение о проведении ЭА (электронный аукцион); внесение изменений |
| `fcsNotificationEF` | fcsPrintForm.xsd | Извещение о проведении ЭА (электронный аукцион); внесение изменений |
| `fcsNotificationEFDateChange` | fcsExtegration.xsd | Проект уведомления об изменении даты и времени проведения электронного аукциона |
| `fcsNotificationEFDateChange` | fcsIntegration.xsd | Пакет данных: Уведомление об изменении даты и времени проведения электронного аукциона |
| `fcsNotificationEFDateChange` | fcsPrintForm.xsd | Уведомление об изменении даты и времени проведения электронного аукциона |
| `fcsNotificationEP` | fcsExtegration.xsd | Проект извещения о проведении закупки у ЕП (единственного поставщика); внесение изменений |
| `fcsNotificationEP` | fcsIntegration.xsd | Пакет данных: Извещение о проведении закупки у ЕП (единственного поставщика); внесение изменений |
| `fcsNotificationEP` | fcsPrintForm.xsd | Извещение о проведении закупки у ЕП (единственного поставщика); внесение изменений |
| `fcsNotificationI111` | fcsPrintForm.xsd | Извещение о проведении закупки способом определения поставщика (подрядчика, исполнителя), установленным Правительством Российской Федерации в соответствии со ст. 111 Федерального закона № 44-ФЗ |
| `fcsNotificationISM` | fcsExtegration.xsd | Проект извещения о проведении закупки многолотовым ИС (иной способ); внесение изменений |
| `fcsNotificationISM` | fcsIntegration.xsd | Пакет данных: Извещение о проведении закупки многолотовым ИС (иной способ); внесение изменений |
| `fcsNotificationISM` | fcsPrintForm.xsd | Извещение о проведении закупки многолотовым ИС (иной способ); внесение изменений |
| `fcsNotificationISO` | fcsExtegration.xsd | Проект извещения о проведении закупки однолотовым ИС (иной способ); внесение изменений |
| `fcsNotificationISO` | fcsIntegration.xsd | Пакет данных: Извещение о проведении закупки однолотовым ИС (иной способ); внесение изменений |
| `fcsNotificationISO` | fcsPrintForm.xsd | Извещение о проведении закупки однолотовым ИС (иной способ); внесение изменений |
| `fcsNotificationLotCancel` | fcsExtegration.xsd | Проект извещения об отмене определения поставщика (подрядчика, исполнителя) в части лота |
| `fcsNotificationLotCancel` | fcsIntegration.xsd | Пакет данных: Извещение об отмене определения поставщика (подрядчика, исполнителя) в части лота |
| `fcsNotificationLotCancel` | fcsPrintForm.xsd | Извещение об отмене определения поставщика (подрядчика, исполнителя) в части лота |
| `fcsNotificationLotChange` | fcsExtegration.xsd | Внесение изменений в извещение в части лота |
| `fcsNotificationLotChange` | fcsIntegration.xsd | Пакет данных: Внесение изменений в извещение в части лота |
| `fcsNotificationLotChange` | fcsPrintForm.xsd | Внесение изменений в извещение в части лота |
| `fcsNotificationOK` | fcsExtegration.xsd | Проект извещения о проведении OK (открытый конкурс); внесение изменений |
| `fcsNotificationOK` | fcsIntegration.xsd | Пакет данных: Извещение о проведении OK (открытый конкурс); внесение изменений |
| `fcsNotificationOK` | fcsPrintForm.xsd | Извещение о проведении OK (открытый конкурс); внесение изменений |
| `fcsNotificationOKD` | fcsExtegration.xsd | Проект извещения о проведении OK-Д (двухэтапный конкурс); внесение изменений |
| `fcsNotificationOKD` | fcsIntegration.xsd | Пакет данных: Извещение о проведении OK-Д (двухэтапный конкурс); внесение изменений |
| `fcsNotificationOKD` | fcsPrintForm.xsd | Извещение о проведении OK-Д (двухэтапный конкурс); внесение изменений |
| `fcsNotificationOKOU` | fcsExtegration.xsd | Проект извещения о проведении OK-ОУ (конкурс с ограниченным участием); внесение изменений |
| `fcsNotificationOKOU` | fcsIntegration.xsd | Пакет данных: Извещение о проведении OK-ОУ (конкурс с ограниченным участием); внесение изменений |
| `fcsNotificationOKOU` | fcsPrintForm.xsd | Извещение о проведении OK-ОУ (конкурс с ограниченным участием); внесение изменений |
| `fcsNotificationOrgChange` | fcsExtegration.xsd | Проект уведомления об изменении организации, осуществляющей закупку |
| `fcsNotificationOrgChange` | fcsIntegration.xsd | Пакет данных:Уведомление об изменении организации, осуществляющей закупку |
| `fcsNotificationOrgChange` | fcsPrintForm.xsd | Уведомление об изменении организации, осуществляющей закупку |
| `fcsNotificationPO` | fcsExtegration.xsd | Проект извещения о проведении ПО (предварительный отбор) |
| `fcsNotificationPO` | fcsIntegration.xsd | Пакет данных: Извещение о проведении ПО (предварительный отбор) |
| `fcsNotificationPO` | fcsPrintForm.xsd | Извещение о проведении ПО (предварительный отбор); внесение изменений |
| `fcsNotificationZakA` | fcsExtegration.xsd | Проект извещения о проведении ЗакА (закрытый аукцион); внесение изменений |
| `fcsNotificationZakA` | fcsIntegration.xsd | Пакет данных: Извещение о проведении ЗакА (закрытый аукцион); внесение изменений |
| `fcsNotificationZakA` | fcsPrintForm.xsd | Извещение о проведении ЗакА (закрытый аукцион); внесение изменений |
| `fcsNotificationZakK` | fcsExtegration.xsd | Проект извещения о проведении ЗакK (закрытый конкурс); внесение изменений |
| `fcsNotificationZakK` | fcsIntegration.xsd | Пакет данных: Извещение о проведении ЗакK (закрытый конкурс); внесение изменений |
| `fcsNotificationZakK` | fcsPrintForm.xsd | Извещение о проведении ЗакK (закрытый конкурс); внесение изменений |
| `fcsNotificationZakKD` | fcsExtegration.xsd | Проект извещения о проведении ЗакK-Д (закрытый двухэтапный конкурс); внесение изменений |
| `fcsNotificationZakKD` | fcsIntegration.xsd | Пакет данных: Извещение о проведении ЗакK-Д (закрытый двухэтапный конкурс); внесение изменений |
| `fcsNotificationZakKD` | fcsPrintForm.xsd | Извещение о проведении ЗакK-Д (закрытый двухэтапный конкурс); внесение изменений |
| `fcsNotificationZakKOU` | fcsExtegration.xsd | Проект извещения о проведении ЗакK-ОУ (закрытый конкурс с ограниченным участием); внесение изменений |
| `fcsNotificationZakKOU` | fcsIntegration.xsd | Пакет данных: Извещение о проведении ЗакK-ОУ (закрытый конкурс с ограниченным участием); внесение изменений |
| `fcsNotificationZakKOU` | fcsPrintForm.xsd | Извещение о проведении ЗакK-ОУ (закрытый конкурс с ограниченным участием); внесение изменений |
| `fcsNotificationZK` | fcsExtegration.xsd | Проект извещения о проведении ЗK (запрос котировок); внесение изменений |
| `fcsNotificationZK` | fcsIntegration.xsd | Пакет данных: Извещение о проведении ЗK (запрос котировок); внесение изменений |
| `fcsNotificationZK` | fcsPrintForm.xsd | Извещение о проведении ЗK (запрос котировок); внесение изменений |
| `fcsNotificationZP` | fcsExtegration.xsd | Проект извещения о проведении ЗП (запрос предложений); внесение изменений |
| `fcsNotificationZP` | fcsIntegration.xsd | Пакет данных: Извещение о проведении ЗП (запроса предложений); внесение изменений |
| `fcsNotificationZP` | fcsPrintForm.xsd | Извещение о проведении ЗП (запрос предложений); внесение изменений |
| `fcsPlacementResult` | fcsIntegration.xsd | Пакет данных:Результат проведения процедуры определения поставщика |
| `fcsPlacementResult` | fcsPrintForm.xsd | Результат проведения процедуры определения поставщика |
| `fcsProposalsResult` | fcsIntegration.xsd | Пакет данных:Результаты распределения количества товаров по каждому заказчику после подведения итогов определения поставщика |
| `fcsProtocolCancel` | fcsExtegration.xsd | Информация об отмене протокола |
| `fcsProtocolCancel` | fcsIntegration.xsd | Пакет данных:Информация об отмене протокола |
| `fcsProtocolCancel` | fcsPrintForm.xsd | Информация об отмене протокола |
| `fcsProtocolDeviation` | fcsExtegration.xsd | Протокол признания участника уклонившимся от заключения контракта; внесение изменений |
| `fcsProtocolDeviation` | fcsIntegration.xsd | Пакет данных: Протокол признания участника уклонившимся от заключения контракта; внесение изменений |
| `fcsProtocolDeviation` | fcsPrintForm.xsd | Протокол признания участника уклонившимся от заключения контракта; внесение изменений |
| `fcsProtocolEF1` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения заявок на участие в электронном аукционе |
| `fcsProtocolEF2` | fcsIntegration.xsd | Пакет данных:Протокол проведения электронного аукциона |
| `fcsProtocolEF3` | fcsIntegration.xsd | Пакет данных:Протокол подведения итогов электронного аукциона |
| `fcsProtocolEFInvalidation` | fcsIntegration.xsd | Пакет данных:Протокол о признании электронного аукциона несостоявшимся |
| `fcsProtocolEFSingleApp` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения единственной заявки на участие в электронном аукционе |
| `fcsProtocolEFSinglePart` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения заявки единственного участника электронного аукциона |
| `fcsProtocolEvasion` | fcsExtegration.xsd | Протокол отказа от заключения контракта; внесение изменений |
| `fcsProtocolEvasion` | fcsIntegration.xsd | Пакет данных:Протокол отказа от заключения контракта; внесение изменений |
| `fcsProtocolEvasion` | fcsPrintForm.xsd | Протокол отказа от заключения контракта; внесение изменений |
| `fcsProtocolOK1` | fcsExtegration.xsd | Протокол вскрытия конвертов с заявками на участие в ОК; внесение изменений |
| `fcsProtocolOK1` | fcsIntegration.xsd | Пакет данных:Протокол вскрытия конвертов с заявками на участие в ОК; внесение изменений |
| `fcsProtocolOK1` | fcsPrintForm.xsd | Протокол вскрытия конвертов с заявками на участие в ОК; внесение изменений |
| `fcsProtocolOK2` | fcsExtegration.xsd | Протокол рассмотрения и оценки заявок на участие в конкурсе в ОК; внесение изменений |
| `fcsProtocolOK2` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения и оценки заявок на участие в конкурсе в ОК; внесение изменений |
| `fcsProtocolOK2` | fcsPrintForm.xsd | Протокол рассмотрения и оценки заявок на участие в конкурсе в ОК; внесение изменений |
| `fcsProtocolOKD1` | fcsExtegration.xsd | Протокол вскрытия конвертов и открытия доступа к электронным документам первоначальных заявок в ОК-Д; внесение изменений |
| `fcsProtocolOKD1` | fcsIntegration.xsd | Пакет данных:Протокол вскрытия конвертов и открытия доступа к электронным документам первоначальных заявок в ОК-Д; внесение изменений |
| `fcsProtocolOKD1` | fcsPrintForm.xsd | Протокол вскрытия конвертов и открытия доступа к электронным документам первоначальных заявок в ОК-Д; внесение изменений |
| `fcsProtocolOKD2` | fcsExtegration.xsd | Протокол предквалификационного отбора в ОК-Д; внесение изменений |
| `fcsProtocolOKD2` | fcsIntegration.xsd | Пакет данных:Протокол предквалификационного отбора в ОК-Д; внесение изменений |
| `fcsProtocolOKD2` | fcsPrintForm.xsd | Протокол предквалификационного отбора в ОК-Д; внесение изменений |
| `fcsProtocolOKD3` | fcsExtegration.xsd | Протокол первого этапа в ОК-Д; внесение изменений |
| `fcsProtocolOKD3` | fcsIntegration.xsd | Пакет данных:Протокол первого этапа в ОК-Д; внесение изменений |
| `fcsProtocolOKD3` | fcsPrintForm.xsd | Протокол первого этапа в ОК-Д; внесение изменений |
| `fcsProtocolOKD4` | fcsExtegration.xsd | Протокол вскрытия конвертов и открытия доступа к электронным документам окончательных заявок в ОК-Д; внесение изменений |
| `fcsProtocolOKD4` | fcsIntegration.xsd | Пакет данных:Протокол вскрытия конвертов и открытия доступа к электронным документам окончательных заявок в ОК-Д; внесение изменений |
| `fcsProtocolOKD4` | fcsPrintForm.xsd | Протокол вскрытия конвертов и открытия доступа к электронным документам окончательных заявок в ОК-Д; внесение изменений |
| `fcsProtocolOKD5` | fcsExtegration.xsd | Протокол рассмотрения и оценки заявок на участие в конкурсе в ОК-Д; внесение изменений |
| `fcsProtocolOKD5` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения и оценки заявок на участие в конкурсе в ОК-Д; внесение изменений |
| `fcsProtocolOKD5` | fcsPrintForm.xsd | Протокол рассмотрения и оценки заявок на участие в конкурсе в ОК-Д; внесение изменений |
| `fcsProtocolOKDSingleApp` | fcsExtegration.xsd | Протокол рассмотрения единственной заявки в ОК-Д; внесение изменений |
| `fcsProtocolOKDSingleApp` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения единственной заявки в ОК-Д; внесение изменений |
| `fcsProtocolOKDSingleApp` | fcsPrintForm.xsd | Протокол рассмотрения единственной заявки в ОК-Д; внесение изменений |
| `fcsProtocolOKOU1` | fcsExtegration.xsd | Протокол вскрытия конвертов и открытия доступа к электронным документам заявок участников в ОК-ОУ; внесение изменений |
| `fcsProtocolOKOU1` | fcsIntegration.xsd | Пакет данных:Протокол вскрытия конвертов и открытия доступа к электронным документам заявок участников в ОК-ОУ; внесение изменений |
| `fcsProtocolOKOU1` | fcsPrintForm.xsd | Протокол вскрытия конвертов и открытия доступа к электронным документам заявок участников в ОК-ОУ; внесение изменений |
| `fcsProtocolOKOU2` | fcsExtegration.xsd | Протокол предквалификационного отбора в ОК-ОУ; внесение изменений |
| `fcsProtocolOKOU2` | fcsIntegration.xsd | Пакет данных:Протокол предквалификационного отбора в ОК-ОУ; внесение изменений |
| `fcsProtocolOKOU2` | fcsPrintForm.xsd | Протокол предквалификационного отбора в ОК-ОУ; внесение изменений |
| `fcsProtocolOKOU3` | fcsExtegration.xsd | Протокол рассмотрения и оценки заявок на участие в конкурсе в ОК-ОУ; внесение изменений |
| `fcsProtocolOKOU3` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения и оценки заявок на участие в конкурсе в ОК-ОУ; внесение изменений |
| `fcsProtocolOKOU3` | fcsPrintForm.xsd | Протокол рассмотрения и оценки заявок на участие в конкурсе в ОК-ОУ; внесение изменений |
| `fcsProtocolOKOUSingleApp` | fcsExtegration.xsd | Протокол рассмотрения единственной заявки в ОК-ОУ; внесение изменений |
| `fcsProtocolOKOUSingleApp` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения единственной заявки в ОК-ОУ; внесение изменений |
| `fcsProtocolOKOUSingleApp` | fcsPrintForm.xsd | Протокол рассмотрения единственной заявки в ОК-ОУ; внесение изменений |
| `fcsProtocolOKSingleApp` | fcsExtegration.xsd | Протокол рассмотрения единственной заявки в ОК; внесение изменений |
| `fcsProtocolOKSingleApp` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения единственной заявки в ОК; внесение изменений |
| `fcsProtocolOKSingleApp` | fcsPrintForm.xsd | Протокол рассмотрения единственной заявки в ОК; внесение изменений |
| `fcsProtocolPO` | fcsExtegration.xsd | Протокол предварительного отбора в ПО; внесение изменений |
| `fcsProtocolPO` | fcsIntegration.xsd | Пакет данных:Протокол предварительного отбора в ПО; внесение изменений |
| `fcsProtocolPO` | fcsPrintForm.xsd | Протокол предварительного отбора в ПО; внесение изменений |
| `fcsProtocolZK` | fcsExtegration.xsd | Протокол рассмотрения и оценки заявок в ЗК; внесение изменений |
| `fcsProtocolZK` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения и оценки заявок в ЗК |
| `fcsProtocolZK` | fcsPrintForm.xsd | Протокол рассмотрения и оценки заявок в ЗК; внесение изменений |
| `fcsProtocolZKAfterProlong` | fcsExtegration.xsd | Протокол рассмотрения и оценки заявок по результатам продления срока подачи заявок; внесение изменений |
| `fcsProtocolZKAfterProlong` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения и оценки заявок по результатам продления срока подачи заявок; внесение изменений |
| `fcsProtocolZKAfterProlong` | fcsPrintForm.xsd | Протокол рассмотрения и оценки заявок по результатам продления срока подачи заявок; внесение изменений |
| `fcsProtocolZKBI` | fcsExtegration.xsd | Проект общей информация об объекте закупки и структурированный протокол рассмотрения и оценки заявок на участие в ЗК-БИ (запрос котировок без извещения); внесение изменений |
| `fcsProtocolZKBI` | fcsIntegration.xsd | Пакет данных:Общая информация об объекте закупки и структурированный протокол рассмотрения и оценки заявок на участие в ЗК-БИ (запрос котировок без извещения); внесение изменений |
| `fcsProtocolZKBI` | fcsPrintForm.xsd | Общая информация об объекте закупки и структурированный протокол рассмотрения и оценки заявок на участие в ЗК-БИ (запрос котировок без извещения); внесение изменений |
| `fcsProtocolZP` | fcsExtegration.xsd | Протокол проведения запроса предложений в ЗП; внесение изменений |
| `fcsProtocolZP` | fcsIntegration.xsd | Пакет данных:Протокол проведения запроса предложений в ЗП; внесение изменений |
| `fcsProtocolZP` | fcsPrintForm.xsd | Протокол проведения запроса предложений в ЗП; внесение изменений |
| `fcsProtocolZPExtract` | fcsExtegration.xsd | Протокол выписки из протокола проведения запроса предложений в ЗП; внесение изменений |
| `fcsProtocolZPExtract` | fcsIntegration.xsd | Пакет данных:Протокол выписки из протокола проведения запроса предложений в ЗП; внесение изменений |
| `fcsProtocolZPExtract` | fcsPrintForm.xsd | Протокол выписки из протокола проведения запроса предложений в ЗП; внесение изменений |
| `fcsProtocolZPFinal` | fcsExtegration.xsd | Итоговый протокол в ЗП; внесение изменений |
| `fcsProtocolZPFinal` | fcsIntegration.xsd | Пакет данных:Итоговый протокол в ЗП; внесение изменений |
| `fcsProtocolZPFinal` | fcsPrintForm.xsd | Итоговый протокол в ЗП; внесение изменений |
| `fcsPublicDiscussionLargePurchase2016` | fcsPrintForm.xsd | Информация об обязательном общественном обсуждения крупной закупки (ООКЗ) до 01.01.2017 |
| `fcsPublicDiscussionSuspension2016` | fcsPrintForm.xsd | Приостановление/возобновление ООКЗ до 01.01.2017 |
| `fcsPurchaseApproval` | fcsPrintForm.xsd | Квитанция согласования публикации |
| `fcsPurchaseDocument` | fcsExtegration.xsd | Проект информации о документе закупки |
| `fcsPurchaseDocument` | fcsIntegration.xsd | Пакет данных: Информация о документе закупки; внесение изменений |
| `fcsPurchaseDocument` | fcsPrintForm.xsd | Информация о документе закупки |
| `fcsPurchaseDocumentCancel` | fcsExtegration.xsd | Проект информации об отмене документа закупки |
| `fcsPurchaseDocumentCancel` | fcsIntegration.xsd | Пакет данных: Информация об отмене документа закупки |
| `fcsPurchaseDocumentCancel` | fcsPrintForm.xsd | Информация об отмене документа закупки |
| `fcsPurchaseProlongationOK` | fcsExtegration.xsd | Проект извещения о продлении срока подачи заявок по открытому конкурсу |
| `fcsPurchaseProlongationOK` | fcsIntegration.xsd | Пакет данных:Уведомление о продлении срока рассмотрения и оценки заявок |
| `fcsPurchaseProlongationOK` | fcsPrintForm.xsd | Извещение о продлении срока подачи заявок по открытому конкурсу |
| `fcsPurchaseProlongationZK` | fcsExtegration.xsd | Проект извещения о продлении срока подачи котировочных заявок |
| `fcsPurchaseProlongationZK` | fcsIntegration.xsd | Пакет данных: Извещение продлении срока подачи котировочных заявок |
| `fcsPurchaseProlongationZK` | fcsPrintForm.xsd | Извещение извещения о продлении срока подачи котировочных заявок |
| `fcsReceivedPackageList` | fcsIntegration.xsd | Пакет данных: Список полученных в ЕИС пакетов |
| `fcsReceivedPackageListRequest` | fcsIntegration.xsd | Пакет данных:Запрос списка полученных в ЕИС пакетов |
| `fcsRegulationRules` | fcsPrintForm.xsd | Версия правил нормирования в сфере закупок |
| `fcsRegulationRulesInvalid` | fcsPrintForm.xsd | Сведения о недействительности правил нормирования в сфере закупок |
| `fcsRegulatoryLegalActInfo` | fcsPrintForm.xsd | Версия сведений о нормативно-правовом акте |
| `fcsReportMeasureSuperAuthProc` | fcsPrintForm.xsd | Отчет о проведенных мероприятиях контрольным органом в сфере закупок |
| `fcsReportMeasureSuperInnerAuth` | fcsPrintForm.xsd | Отчет о проведенных мероприятиях органом внутреннего контроля |
| `fcsRequestForQuotation` | fcsExtegration.xsd | Версия запроса цен товаров, работ, услуг |
| `fcsRequestForQuotation` | fcsIntegration.xsd | Пакет данных:Версия запроса цен товаров, работ, услуг |
| `fcsRequestForQuotation` | fcsPrintForm.xsd | Версия запроса цен товаров, работ, услуг |
| `fcsRequestForQuotationCancel` | fcsExtegration.xsd | Отмена запроса цен товаров, работ, услуг |
| `fcsRequestForQuotationCancel` | fcsIntegration.xsd | Пакет данных:Отмена запроса цен товаров, работ, услуг |
| `fcsRequestForQuotationCancel` | fcsPrintForm.xsd | Отмена запроса цен товаров, работ, услуг |
| `fcsReSendPackage` | fcsIntegration.xsd | Пакет данных:Запрос на повторную отправку пакета |
| `fcsSecondPartAppOpening` | fcsIntegration.xsd | Пакет данных: Сведения о факте вскрытия вторых частей заявок |
| `fcsSentPackageList` | fcsIntegration.xsd | Пакет данных: Список отправленных из ЕИС пакетов |
| `fcsSentPackageListRequest` | fcsIntegration.xsd | Пакет данных:Запрос списка отправленных из ЕИС пакетов |
| `fcsStandardContract` | fcsPrintForm.xsd | Типовой контракт, типовые условия контракта, сведения о недействительности |
| `fcsStandardContractInvalid` | fcsPrintForm.xsd | Сведения о недействительности типового контракта, типовых условий контракта |
| `fcsTimeEF` | fcsIntegration.xsd | Пакет данных: Время проведения электронного аукциона |
| `finishRequest` | eis-fs-ws-api.xsd | Пакет данных: Запрос на завершение сессии передачи файла |
| `finishResponse` | eis-fs-ws-api.xsd | Пакет данных: Ответ на завершение сессии передачи файла |
| `getActualRigthsRisRequest` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Запрос связанных организаций и установленных прав |
| `getActualRigthsRisResponse` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Ответ на запрос связанных организаций и установленных прав |
| `getAnalyticalReportsRequest` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Запрос в ХД аналитических отчетов по набору параметров |
| `getAnalyticalReportsResponse` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Ответ на запрос в ХД аналитических отчетов по набору параметров |
| `getBOObjectInfoRequest` | docs-https-api.xsd | Запрос сведений о документе БО |
| `getBOObjectInfoResponse` | docs-https-api.xsd | Ответ на запрос сведений о документе БО |
| `getBOObjectListRequest` | docs-https-api.xsd | Запрос сведений о документах БО |
| `getBOObjectListResponse` | docs-https-api.xsd | Ответ на запрос сведений о документах БО |
| `getDocsByOrgRegionRequest` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Запрос формирования в ХД архивов с документами по региону заказчика и типу документа |
| `getDocsByOrgRegionRequest` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Запрос формирования в ХД архивов с документами по региону заказчика и типу документа |
| `getDocsByOrgRegionResponse` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Ответ на запрос формирования в ХД архивов с документами по региону заказчика и типу документа |
| `getDocsByOrgRegionResponse` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Ответ на запрос формирования в ХД архивов с документами по региону заказчика и типу документа |
| `getDocsByReestrNumberRequest` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Запрос формирования в ХД архивов с документами по реестровому номеру |
| `getDocsByReestrNumberRequest` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Запрос формирования в ХД архивов с документами по реестровому номеру |
| `getDocsByReestrNumberResponse` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Ответ на запрос формирования в ХД архивов с документами по реестровому номеру |
| `getDocsByReestrNumberResponse` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Ответ на запрос формирования в ХД архивов с документами по реестровому номеру |
| `getDocSignaturesByUrlRequest` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Запрос формирования в ХД архивов с подписями документов |
| `getDocSignaturesByUrlRequest` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Запрос формирования в ХД архивов с подписями документов |
| `getDocSignaturesByUrlRequest` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Запрос формирования в ХД архивов с подписями документов |
| `getDocSignaturesByUrlRequest` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Запрос формирования в ХД архивов с подписями документов |
| `getDocSignaturesByUrlRequest` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Запрос формирования в ХД архивов с подписями документов |
| `getDocSignaturesByUrlResponse` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Ответ на запрос формирования в ХД архивов с подписями документов |
| `getDocSignaturesByUrlResponse` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Ответ на запрос формирования в ХД архивов с подписями документов |
| `getDocSignaturesByUrlResponse` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Ответ на запрос формирования в ХД архивов с подписями документов |
| `getDocSignaturesByUrlResponse` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Ответ на запрос формирования в ХД архивов с подписями документов |
| `getDocSignaturesByUrlResponse` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Ответ на запрос формирования в ХД архивов с подписями документов |
| `getDocsOrg223Request` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Запрос формирования в ХД архива с документов по списку заказчиков 223-ФЗ |
| `getDocsOrg223Response` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Ответ на запрос формирования в ХД архива с документов по списку заказчиков 223-ФЗ |
| `getDocsOrgByReestrNumberRequest` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Запрос формирования в ХД архивов с документами по реестровому номеру |
| `getDocsOrgByReestrNumberResponse` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Ответ на запрос формирования в ХД архивов с документами по реестровому номеру |
| `getDocsOrgRequest` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Запрос формирования в ХД архивов с документами по набору параметров |
| `getDocsOrgResponse` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Ответ на запрос формирования в ХД архивов с документами по набору параметров |
| `getDocsParticularRequest` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Запрос на получение архивов с документами по специфическому набору параметров |
| `getDocsParticularResponse` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Ответ на запрос получения архивов с документами по специфическому набору параметров |
| `getEADocsRequest` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Запрос документов по электронному актированию |
| `getEADocsRequest` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Запрос документов по электронному актированию |
| `getEADocsResponse` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Ответ на запрос документов по электронному актированию |
| `getEADocsResponse` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Ответ на запрос документов по электронному актированию |
| `getErrorResponse` | docs-ws-api.xsd | Ответ на запрос сведений с описанием ошибки |
| `getHiddenBankDocsRequest` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Запрос формирования в ХД архивов с сокрытыми документами банков по набору параметров |
| `getHiddenBankDocsResponse` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Ответ на запрос формирования в ХД архивов с сокрытыми документами банков по набору параметров |
| `getHiddenDocsByOrgRegionRequest` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Запрос формирования в ХД архивов с сокрытыми документами по региону заказчика и типу документа |
| `getHiddenDocsByOrgRegionResponse` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Ответ на запрос формирования в ХД архивов с сокрытыми документами по региону заказчика и типу документа |
| `getHiddenDocsByReestrNumberRequest` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Запрос формирования в ХД архивов с сокрытыми документами по реестровому номеру |
| `getHiddenDocsByReestrNumberResponse` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Ответ на запрос формирования в ХД архивов с сокрытыми документами по реестровому номеру |
| `getHiddenDocsRequest` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Запрос формирования в ХД архивов с сокрытыми документами по набору параметров |
| `getHiddenDocsResponse` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Ответ на запрос формирования в ХД архивов с сокрытыми документами по набору параметров |
| `getHiddenDocsRisByReestrNumberRequest` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Запрос формирования в ХД архивов с сокрытыми документами по реестровому номеру |
| `getHiddenDocsRisByReestrNumberResponse` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Ответ на запрос формирования в ХД архивов с сокрытыми документами по реестровому номеру |
| `getHiddenDocsRisRequest` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Запрос формирования в ХД архивов с сокрытыми документами по набору параметров |
| `getHiddenDocsRisResponse` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Ответ на запрос формирования в ХД архивов с сокрытыми документами по набору параметров |
| `getKOObjectInfoRequest` | docs-ws-api.xsd | Запрос сведений о документе РКО |
| `getKOObjectInfoResponse` | docs-ws-api.xsd | Ответ на запрос сведений о документе РКО |
| `getKOObjectListRequest` | docs-ws-api.xsd | Запрос сведений о размещенных документах РКО |
| `getKOObjectListResponse` | docs-ws-api.xsd | Ответ на запрос сведений о размещенных документах РКО |
| `getNsiOrgRequest` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Запрос в ХД данных справочника |
| `getNsiOrgResponse` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Ответ на запрос в ХД данных справочника |
| `getNsiRequest` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Запрос в ХД данных справочника |
| `getNsiRequest` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Запрос в ХД данных справочника |
| `getNsiRequest` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Запрос данных справочника |
| `getNsiResponse` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Ответ на запрос в ХД данных справочника |
| `getNsiResponse` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Ответ на запрос в ХД данных справочника |
| `getNsiResponse` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Ответ на запрос данных справочника |
| `getNsiRisRequest` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Запрос в ХД данных справочника |
| `getNsiRisResponse` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Ответ на запрос в ХД данных справочника |
| `getObjectRequest` | queue-ws-api.xsd | Запрос сведений о размещенном документе |
| `getObjectResponse` | queue-ws-api.xsd | Ответ на запрос сведений о документе |
| `getObjectsRequest` | QueueVBS\queue-vbs-ws-api.xsd | Запрос сведений о финансовых документах |
| `getObjectsResponse` | QueueVBS\queue-vbs-ws-api.xsd | Ответ на запрос сведений о финансовых документах |
| `getPreparedArchivesRequest` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Запрос на получение предподготовленных архивов с документами |
| `getPreparedArchivesResponse` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Ответ на запрос получения предподготовленных архивов с документами |
| `getPreparedPartRequest` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Запрос информации о подготовленных архивах по ранее направленному запросу |
| `getPreparedPartRequest` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Запрос информации о подготовленных архивах по ранее направленному запросу |
| `getPreparedPartRequest` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Запрос информации о подготовленных архивах по ранее направленному запросу |
| `getPreparedPartRequest` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Запрос информации о подготовленных архивах по ранее направленному запросу |
| `getPreparedPartRequest` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Запрос информации о подготовленных архивах по ранее направленному запросу |
| `getPreparedPartResponse` | GetDocsWS\GetDocsIndividualPerson\getDocsIP-ws-api.xsd | Ответ на запрос информации о подготовленных архивах по ранее направленному запросу |
| `getPreparedPartResponse` | GetDocsWS\GetDocsLegalEntity\getDocsLE-ws-api.xsd | Ответ на запрос информации о подготовленных архивах по ранее направленному запросу |
| `getPreparedPartResponse` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Ответ на запрос информации о подготовленных архивах по ранее направленному запросу |
| `getPreparedPartResponse` | GetDocsWS\GetDocsOrganization\getDocsOrganization-ws-api.xsd | Ответ на запрос информации о подготовленных архивах по ранее направленному запросу |
| `getPreparedPartResponse` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Ответ на запрос информации о подготовленных архивах по ранее направленному запросу |
| `getProcessingResultRequest` | eisSigningSOAPMessages.xsd | Запрос результата приёма документа, принимаемый в составе метода getProcessingResult Web-сервиса приема подписанных сведений на ЕИС |
| `getProcessingResultResponse` | eisSigningSOAPMessages.xsd |  |
| `getPublicDocsByOrgRegionRequest` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Запрос формирования в ХД архивов с публичными документами по региону заказчика и типу документа |
| `getPublicDocsByOrgRegionResponse` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Ответ на запрос формирования в ХД архивов с публичными документами по региону заказчика и типу документа |
| `getPublicDocsByReestrNumberRequest` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Запрос формирования в ХД архивов с публичными документами по реестровому номеру |
| `getPublicDocsByReestrNumberResponse` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Ответ на запрос формирования в ХД архивов с публичными документами по реестровому номеру |
| `getPublicDocsRequest` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Запрос формирования в ХД архивов с публичными документами по набору параметров |
| `getPublicDocsResponse` | GetDocsWS\GetDocsMIS\getDocsMIS-ws-api.xsd | Ответ на запрос формирования в ХД архивов с публичными документами по набору параметров |
| `getPublicDocsRisByReestrNumberRequest` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Запрос формирования в ХД архивов с публичными документами по реестровому номеру |
| `getPublicDocsRisByReestrNumberResponse` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Ответ на запрос формирования в ХД архивов с публичными документами по реестровому номеру |
| `getPublicDocsRisRequest` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Запрос формирования в ХД архивов с публичными документами по набору параметров |
| `getPublicDocsRisResponse` | GetDocsWS\GetDocsRIS\getDocsRIS-ws-api.xsd | Ответ на запрос формирования в ХД архивов с публичными документами по набору параметров |
| `getRBGObjectInfoRequest` | docs-https-api.xsd | Запрос сведений о документе РНГ |
| `getRBGObjectInfoResponse` | docs-https-api.xsd | Ответ на запрос сведений о документе РНГ |
| `getRBGObjectListForBankRequest` | docs-https-api.xsd | Запрос сведений о размещенных документах РНГ гаранта |
| `getRBGObjectListForOrgRequest` | docs-https-api.xsd | Запрос сведений о размещенных документах РНГ заказчика |
| `getRBGObjectListResponse` | docs-https-api.xsd | Ответ на запрос сведений о размещенных документах РНГ |
| `getRKObjectInfoRequest` | docs-ws-api.xsd | Запрос сведений о документе РК |
| `getRKObjectInfoResponse` | docs-ws-api.xsd | Ответ на запрос сведений о документе РК |
| `getRKObjectListRequest` | docs-ws-api.xsd | Запрос сведений о размещенных документах РК |
| `getRKObjectListResponse` | docs-ws-api.xsd | Ответ на запрос сведений о размещенных документах РК |
| `getRNPObjectListRequest` | docs-ws-api.xsd | Запрос сведений о размещенных документах РНП. Устарело, не применяется с 01.04.2022 |
| `getRNPObjectListResponse` | docs-ws-api.xsd | Ответ на запрос сведений о размещенных документах РНП. Устарело, не применяется с 01.04.2022 |
| `getROKOObjectInfoRequest` | docs-ws-api.xsd | Запрос сведений о документе РОКО |
| `getROKOObjectInfoResponse` | docs-ws-api.xsd | Ответ на запрос сведений о документе РОКО |
| `getROKOObjectListRequest` | docs-ws-api.xsd | Запрос сведений о размещенных документах РОКО |
| `getROKOObjectListResponse` | docs-ws-api.xsd | Ответ на запрос сведений о размещенных документах РОКО |
| `getRPGObjectInfoRequest` | docs-ws-api.xsd | Запрос сведений о документе РПГ |
| `getRPGObjectInfoResponse` | docs-ws-api.xsd | Ответ на запрос сведений о документе РПГ |
| `getRPGObjectListRequest` | docs-ws-api.xsd | Запрос сведений о размещенных документах РПГ |
| `getRPGObjectListResponse` | docs-ws-api.xsd | Ответ на запрос сведений о размещенных документах РПГ |
| `getUnfairSupplier2022ObjectListRequest` | docs-ws-api.xsd | Запрос сведений о размещенных документах Реестра недобросовестных поставщиков (РНП) с 01.04.2022 |
| `getUnfairSupplier2022ObjectListResponse` | docs-ws-api.xsd | Ответ на запрос сведений о размещенных документах Реестра недобросовестных поставщиков (РНП) с 01.04.2022 |
| `KTRUPosition` | fcsPrintForm.xsd | Позиция КТРУ |
| `KTRUPositions` | fcsPrintForm.xsd | Позиции КТРУ |
| `manufacturerReport` | fcsPrintForm.xsd | Отчет о количестве товара и (или) объеме услуги, соответственно произведенного и (или) оказанной поставщиком (исполнителем), с которым заключен контракт в соответствии со ст.111.3, ст.111.4 Закона №44-ФЗ |
| `manufacturerReportCancel` | fcsPrintForm.xsd | Аннулирование отчета о количестве товара и (или) объеме услуги, соответственно произведенного и (или) оказанной поставщиком (исполнителем), с которым заключен контракт в соответствии со ст.111.3, ст.111.4 Закона №44-ФЗ |
| `masterData` | fcsIntegration.xsd | Пакет данных:Набор элементов справочников и классификаторов |
| `mzMasterData` | fcsIntegration.xsd | Пакет данных:Набор элементов справочников и классификаторов (МЗ) |
| `notificationException` | fcsPrintForm.xsd | Уведомление об исключении информации и документов с официального сайта ЕИС |
| `notificationRemoveDoc` | fcsIntegration.xsd | Пакет данных:Уведомление об удалении в ЕИС проекта документа |
| `nsiRMIS` | fcsPrintForm.xsd | Перечень информационных систем (для формирования печатной формы) |
| `parClaimsCorrespondenceNotice` | lkp-eisPrintForm.xsd | Уведомление в рамках претензионной переписки, сформированное поставщиком |
| `parContractProcedureUnilateralRefusal` | lkp-eisPrintForm.xsd | Решение об одностороннем отказе от исполнения контракта, сформированное поставщиком |
| `parContractProcedureUnilateralRefusalCancel` | lkp-eisPrintForm.xsd | Извещение об отмене решения об одностороннем отказе от исполнения контракта, сформированное поставщиком |
| `parElectronicComplaint` | lkp-eisPrintForm.xsd | Информация об электронной жалобе, сформированной в ЛКП |
| `parElectronicComplaintAccept` | fcsIntegration.xsd | Пакет данных:Информация о принятии к рассмотрению электронной жалобы, сформированной в ЛКП |
| `parElectronicComplaintAccept` | fcsPrintForm.xsd | Информация о принятии к рассмотрению электронной жалобы, сформированной в ЛКП |
| `parElectronicComplaintCancel` | lkp-eisPrintForm.xsd | Информация об отзыве электронной жалобы, сформированной в ЛКП |
| `parElectronicComplaintRefusal` | fcsIntegration.xsd | Пакет данных:Информация об отказе в рассмотрении электронной жалобы, сформированной в ЛКП |
| `parElectronicComplaintRefusal` | fcsPrintForm.xsd | Информация об отказе в рассмотрении электронной жалобы, сформированной в ЛКП |
| `ppaNondisclosureAgreement` | fcsPrintForm.xsd | Уведомление о неразглашении сведений |
| `pprf615ActCancel` | fcsExtegration.xsd | Проект информации об отмене акта по ПП РФ № 615 |
| `pprf615ActCancel` | fcsIntegration.xsd | Пакет данных:Информация об отмене акта по ПП РФ № 615 |
| `pprf615ActCancel` | fcsPrintForm.xsd | Информация об отмене акта по ПП РФ № 615 |
| `pprf615ActDeviation` | fcsExtegration.xsd | Проект акта признания участника уклонившимся от заключения контракта по ПП РФ № 615 |
| `pprf615ActDeviation` | fcsIntegration.xsd | Пакет данных:Акт признания участника уклонившимся от заключения контракта по ПП РФ № 615; внесение изменений |
| `pprf615ActDeviation` | fcsPrintForm.xsd | Акт признания участника уклонившимся от заключения контракта по ПП РФ № 615 |
| `pprf615ActEvasion` | fcsExtegration.xsd | Проект акта отказа от заключения контракта по ПП РФ № 615 |
| `pprf615ActEvasion` | fcsIntegration.xsd | Пакет данных:Акт отказа от заключения контракта по ПП РФ № 615; внесение изменений |
| `pprf615ActEvasion` | fcsPrintForm.xsd | Пакет данных:Акт отказа от заключения контракта по ПП РФ № 615 |
| `pprf615Clarification` | fcsExtegration.xsd | Проект разъяснения положений документации по ПП РФ № 615 |
| `pprf615Clarification` | fcsIntegration.xsd | Пакет данных: Разъяснение положений документации по ПП РФ № 615 |
| `pprf615Clarification` | fcsPrintForm.xsd | Разъяснение положений документации по ПП РФ № 615 |
| `pprf615ClarificationRequest` | fcsIntegration.xsd | Пакет данных: Запрос ЭП о даче разъяснений положений документации по ПП РФ № 615 |
| `pprf615ClarificationRequest` | fcsPrintForm.xsd | Запрос ЭП о даче разъяснений положений документации по ПП РФ № 615 |
| `pprf615Contract` | fcsExtegration.xsd | Проект сведений о договоре о проведении капитального ремонта по ПП РФ № 615 |
| `pprf615Contract` | fcsIntegration.xsd | Пакет данных:Сведения о договоре о проведении капитального ремонта по ПП РФ № 615; внесение изменений |
| `pprf615Contract` | fcsPrintForm.xsd | Сведения о договоре о проведении капитального ремонта по ПП РФ № 615 |
| `pprf615ContractDiscrepancyProtocol` | fcsIntegration.xsd | Пакет данных: Протокол о несоответствии проверяемой информации по ПП РФ № 615 |
| `pprf615ContractDiscrepancyProtocol` | fcsPrintForm.xsd | Протокол о несоответствии проверяемой информации по ПП РФ № 615 |
| `pprf615ContractProcedure` | fcsExtegration.xsd | Проект сведений об исполнении/расторжении договора о проведении капитального ремонта по ПП РФ № 615 |
| `pprf615ContractProcedure` | fcsIntegration.xsd | Пакет данных:Сведения об исполнении/расторжении договора о проведении капитального ремонта по ПП РФ № 615; |
| `pprf615ContractProcedure` | fcsPrintForm.xsd | Сведения об исполнении/расторжении договора о проведении капитального ремонта по ПП РФ № 615 |
| `pprf615ContractProcedureCancel` | fcsExtegration.xsd | Проект сведений об отмене информации об исполнении/расторжении договора о проведении капитального ремонта по ПП РФ № 615 |
| `pprf615ContractProcedureCancel` | fcsIntegration.xsd | Пакет данных:Сведения об отмене информации об исполнении/расторжении договора о проведении капитального ремонта по ПП РФ № 615 |
| `pprf615ContractProcedureCancel` | fcsPrintForm.xsd | Отмена информации об исполнении/расторжении договора о проведении капитального ремонта по ПП РФ № 615 |
| `pprf615ContractSign` | fcsIntegration.xsd | Пакет данных:Сведения о заключенном в электронной форме на ЭП договоре оказания услуг и (или) выполнения работ по капитальному ремонту общего имущества в многоквартирном доме по ПП РФ № 615 |
| `pprf615MasterData` | fcsIntegration.xsd | Пакет данных:Набор элементов справочников и классификаторов по ПП РФ № 615. Устарело, не применяется |
| `pprf615NotificationCancel` | fcsExtegration.xsd | Проект извещения об отмене закупки по ПП РФ № 615 |
| `pprf615NotificationCancel` | fcsIntegration.xsd | Пакет данных:Извещение об отмене закупки по ПП РФ № 615 |
| `pprf615NotificationCancel` | fcsPrintForm.xsd |  |
| `pprf615NotificationEF` | fcsExtegration.xsd | Проект извещения о проведении ЭА (электронный аукцион) по ПП РФ № 615 |
| `pprf615NotificationEF` | fcsIntegration.xsd | Пакет данных: Извещение о проведении ЭА (электронный аукцион) по ПП РФ № 615; внесение изменений |
| `pprf615NotificationEF` | fcsPrintForm.xsd | Извещение о проведении ЭА (электронный аукцион) по ПП РФ № 615 |
| `pprf615NotificationPO` | fcsExtegration.xsd | Извещение о проведении ПО (предварительный отбор) по ПП РФ № 615 |
| `pprf615NotificationPO` | fcsIntegration.xsd | Пакет данных: Извещение о проведении ПО (предварительный отбор) по ПП РФ № 615; внесение изменений |
| `pprf615NotificationPO` | fcsPrintForm.xsd | Извещение о проведении ПО (предварительный отбор) по ПП РФ № 615 |
| `pprf615ProtocolCancel` | fcsIntegration.xsd | Пакет данных:Информация об отмене протокола по ПП РФ № 615 |
| `pprf615ProtocolCancel` | fcsPrintForm.xsd | Информация об отмене протокола по ПП РФ № 615 |
| `pprf615ProtocolEF1` | fcsIntegration.xsd | Пакет данных:Протокол рассмотрения заявок на участие в электронном аукционе по ПП РФ № 615; внесение изменений |
| `pprf615ProtocolEF1` | fcsPrintForm.xsd | Протокол рассмотрения заявок на участие в электронном аукционе по ПП РФ № 615 |
| `pprf615ProtocolEF2` | fcsIntegration.xsd | Пакет данных:Протокол проведения электронного аукциона по ПП РФ № 615; внесение изменений |
| `pprf615ProtocolEF2` | fcsPrintForm.xsd | Протокол проведения электронного аукциона по ПП РФ № 615 |
| `pprf615ProtocolPO` | fcsIntegration.xsd | Пакет данных:Протокол предварительного отбора в ПО по ПП РФ № 615; внесение изменений |
| `pprf615ProtocolPO` | fcsPrintForm.xsd | Протокол предварительного отбора в ПО по ПП РФ № 615 |
| `pprf615QualifiedContractor` | fcsIntegration.xsd | Пакет данных:Сведения о квалифицированной подрядной организации для включения в РКПО по ПП РФ № 615; внесение изменений |
| `pprf615QualifiedContractor` | fcsPrintForm.xsd | Сведения о квалифицированной подрядной организации для включения в РКПО по ПП РФ № 615 |
| `pprf615QualifiedContractorExclude` | fcsIntegration.xsd | Пакет данных: Сведения об исключении квалифицированной подрядной организации из РКПО по ПП РФ № 615 |
| `pprf615QualifiedContractorExclude` | fcsPrintForm.xsd | Сведения об исключении квалифицированной подрядной организации из РКПО по ПП РФ № 615 |
| `pprf615QualifiedContractorExcludeCancel` | fcsIntegration.xsd | Пакет данных: Сведения об отмене исключения квалифицированной подрядной организации из РКПО по ПП РФ № 615 |
| `pprf615QualifiedContractorExcludeCancel` | fcsPrintForm.xsd | Сведения об отмене исключения квалифицированной подрядной организации из РКПО по ПП РФ № 615 |
| `pprf615TimeEF` | fcsIntegration.xsd | Пакет данных: Время проведения электронного аукциона по ПП РФ № 615 |
| `pprf615TimeEF` | fcsPrintForm.xsd | Время проведения электронного аукциона по ПП РФ № 615 |
| `pprf615UnfairContractor` | fcsPrintForm.xsd | Сведения о недобросовестой подрядной организации по ПП РФ № 615. Устарело, не применяется |
| `pprf615UnfairContractor2022` | fcsPrintForm.xsd | Сведения о недобросовестной подрядной организации по ПП РФ № 615 с 01.04.2022 |
| `pprf615UnfairContractor2022Exclude` | fcsPrintForm.xsd | Исключение сведений о недобросовестной подрядной организации по ПП РФ № 615 с 01.04.2022 |
| `processingProjectResult` | eisSignIncoming.xsd | Пакет данных:Уведомление о результатах обработки информационного пакета для принятых проектов документов |
| `processingResult` | eisSignIncoming.xsd | Пакет данных:Уведомление о результатах обработки информационного пакета |
| `publicDiscussionAnswer` | fcsPrintForm.xsd | Ответ на комментарий ООКЗ |
| `publicDiscussionComment` | fcsPrintForm.xsd | Комментарий ООКЗ |
| `publicDiscussionForm` | fcsPrintForm.xsd | Анкета ООКЗ |
| `publicDiscussionLargePurchasePhase1` | fcsPrintForm.xsd | Информация о первом этапе обязательного общественного обсуждения крупной закупки (ООКЗ) |
| `publicDiscussionLargePurchasePhase2` | fcsPrintForm.xsd | Информация о втором этапе обязательного общественного обсуждения крупной закупки (ООКЗ) |
| `publicDiscussionSuspensionPhase1` | fcsPrintForm.xsd | Приостановление/возобновление первого этапа ООКЗ |
| `publicDiscussionSuspensionPhase2` | fcsPrintForm.xsd | Приостановление/возобновление второго этапа ООКЗ |
| `purchasePlan` | fcsExtegration.xsd | Проект плана закупок в структурированной форме |
| `purchasePlan` | fcsIntegration.xsd | Пакет данных: Проект плана закупок в структурированной форме |
| `purchasePlan` | fcsPrintForm.xsd | План закупок в структурированной форме |
| `purchasePlanChange` | fcsExtegration.xsd | Проект изменения плана закупок в структурированной форме |
| `purchasePlanChange` | fcsIntegration.xsd | Пакет данных: Изменение плана закупок в структурированной форме |
| `purchasePlanExecution` | fcsExtegration.xsd | Проект исполнения плана закупок в структурированной форме |
| `purchasePlanExecution` | fcsIntegration.xsd | Пакет данных: Проект исполнения плана закупок в структурированной форме |
| `purchasePlanExecution` | fcsPrintForm.xsd | Исполнение плана закупок в структурированной форме |
| `receiveRgRequest` | eisSigningSOAPMessages.xsd | Документы, принимаемые в составе метода receiveRg Web-сервиса приема подписанных сведений на ЕИС |
| `receiveRgResponse` | eisSigningSOAPMessages.xsd |  |
| `receiveRokoRequest` | eisSigningSOAPMessages.xsd | Документы, принимаемые в составе метода receiveRoko Web-сервиса приема подписанных сведений на ЕИС |
| `receiveRokoResponse` | eisSigningSOAPMessages.xsd |  |
| `receiveRppOvkRequest` | eisSigningSOAPMessages.xsd | Документы, принимаемые в составе метода receiveRppOvk Web-сервиса приема подписанных сведений на ЕИС |
| `receiveRppOvkResponse` | eisSigningSOAPMessages.xsd |  |
| `receiveRppRequest` | eisSigningSOAPMessages.xsd | Документы, принимаемые в составе метода receiveRpp Web-сервиса приема подписанных сведений на ЕИС |
| `receiveRppResponse` | eisSigningSOAPMessages.xsd |  |
| `receiveRrkOvkRequest` | eisSigningSOAPMessages.xsd | Документы, принимаемые в составе метода receiveRrkOvk Web-сервиса приема подписанных сведений на ЕИС |
| `receiveRrkOvkResponse` | eisSigningSOAPMessages.xsd |  |
| `receiveRrkRequest` | eisSigningSOAPMessages.xsd | Документы, принимаемые в составе метода receiveRrk Web-сервиса приема подписанных сведений на ЕИС |
| `receiveRrkResponse` | eisSigningSOAPMessages.xsd |  |
| `receiveRvpOvkRequest` | eisSigningSOAPMessages.xsd | Документы, принимаемые в составе метода receiveRvpOvk Web-сервиса приема подписанных сведений на ЕИС |
| `receiveRvpOvkResponse` | eisSigningSOAPMessages.xsd |  |
| `receiveRvpRequest` | eisSigningSOAPMessages.xsd | Документы, принимаемые в составе метода receiveRvp Web-сервиса приема подписанных сведений на ЕИС |
| `receiveRvpResponse` | eisSigningSOAPMessages.xsd |  |
| `repAutoNotPassProtocol` | fcsPrintForm.xsd | Протокол о непрохождении автоматической проверки соблюдения правил формирования и направления информации в РЕП |
| `repAutoTestNotice` | fcsPrintForm.xsd | Уведомление о прохождении автоматической проверки соблюдения правил формирования и направления информации в РЕП |
| `repOnlySupplier` | fcsPrintForm.xsd | Информация о единственном поставщике из Реестра единственных поставщиков товара, производство которого создается модернизируется, осваивается, единственном исполнителе услуги, оказываемой с использованием имущества, которое создается, реконструируется (РЕП) |
| `sketchPlan` | fcsExtegration.xsd | Проект плана закупок в неструктурированной форме |
| `sketchPlan` | fcsIntegration.xsd | Пакет данных: План закупок в неструктурированной форме |
| `sketchPlan` | fcsPrintForm.xsd | План закупок в неструктурированной форме |
| `sketchPlanExecution` | fcsExtegration.xsd | Проект сведений об исполнении плана закупок |
| `sketchPlanExecution` | fcsIntegration.xsd | Пакет данных: Сведения об исполнении плана закупок |
| `sketchPlanExecution` | fcsPrintForm.xsd | Сведения об исполнении плана закупок в неструктурированной форме |
| `startRequest` | eis-fs-ws-api.xsd | Пакет данных: Запрос инициации сессии передачи файла в файловое хранилище |
| `startResponse` | eis-fs-ws-api.xsd | Пакет данных: Ответ на инициацию сессии передачи файла |
| `tenderPlan` | fcsExtegration.xsd | Проект плана-графика в структурированной форме |
| `tenderPlan` | fcsIntegration.xsd | Пакет данных: План-график; внесение изменений |
| `tenderPlan` | fcsPrintForm.xsd | План-график в структурированной форме |
| `tenderPlan2017` | fcsExtegration.xsd | Проект плана-графика в структурированной форме с 01.01.2017 |
| `tenderPlan2017` | fcsIntegration.xsd | Пакет данных: План-график с 01.01.2017; внесение изменений |
| `tenderPlan2017` | fcsPrintForm.xsd | План-график в структурированной форме с 01.01.2017 |
| `tenderPlan2020` | fcsExtegration.xsd | Проект плана-графика закупок с 01.01.2020 |
| `tenderPlan2020` | fcsIntegration.xsd | Пакет данных: План-график закупок с 01.01.2020; внесение изменений |
| `tenderPlan2020` | fcsPrintForm.xsd | План-график закупок с 01.01.2020 |
| `tenderPlan2020Change` | fcsExtegration.xsd | Проект изменения плана-графика закупок с 01.01.2020 |
| `tenderPlan2020Change` | fcsIntegration.xsd | Пакет данных: Изменение плана-графика закупок с 01.01.2020 |
| `tenderPlanCancel` | fcsIntegration.xsd | Пакет данных:Аннулирование плана-графика |
| `tenderPlanCancel` | fcsPrintForm.xsd | Аннулирование плана-графика |
| `tenderPlanChange` | fcsExtegration.xsd | Проект изменения плана-графика |
| `tenderPlanChange` | fcsIntegration.xsd | Пакет данных: Изменение плана-графика |
| `tenderPlanChange2017` | fcsExtegration.xsd | Проект изменения плана-графика с 01.01.2017 |
| `tenderPlanChange2017` | fcsIntegration.xsd | Пакет данных: Изменение плана-графика с 01.01.2017 |
| `tenderPlanUnstructured` | fcsExtegration.xsd | Проект плана-графика в неструктурированной форме |
| `tenderPlanUnstructured` | fcsIntegration.xsd | Пакет данных: План-график в неструктурированной форме; внесение изменений |
| `tenderPlanUnstructured` | fcsPrintForm.xsd | План-график в неструктурированной форме |
| `tenderSuspension` | fcsIntegration.xsd | Пакет данных: Информация о приостановке определения поставщика (подрядчика, исполнителя) в части заключения контракта |
| `tenderSuspension` | fcsPrintForm.xsd | Информация о приостановке определения поставщика (подрядчика, исполнителя) в части заключения контракта для ИС КО |
| `unfairSupplier` | fcsPrintForm.xsd | Сведения о недобросовестном поставщике. Устарело, не применяется с 01.04.2022 |
| `unfairSupplier2022` | fcsPrintForm.xsd | Запись Реестра недобросовестных поставщиков (РНП) с 01.04.2022 |
| `unfairSupplier2022Exclude` | fcsPrintForm.xsd | Исключение записи Реестра недобросовестных поставщиков (РНП) с 01.04.2022 |
| `unplannedCheck` | fcsIntegration.xsd | Пакет данных: Информация по внеплановой проверке |
| `unplannedCheck` | fcsPrintForm.xsd | Информация по внеплановой проверке для ИС КО |
| `unplannedCheckCancel` | fcsIntegration.xsd | Пакет данных: Информация об отмене проведения внеплановой проверки |
| `unplannedCheckCancel` | fcsPrintForm.xsd | Информация об отмене проведения внеплановой проверки для ИС КО |
| `unplannedCheckTenderSusp` | fcsIntegration.xsd | Пакет данных: Информация о приостановке определения поставщика (подрядчика, исполнителя) в части заключения контракта по внеплановой проверке |
| `unplannedEvent` | fcsIntegration.xsd | Пакет данных: Информация по внеплановому контрольному мероприятию для ОВК |
| `unplannedEvent` | fcsPrintForm.xsd | Информация по внеплановому контрольному мероприятию для ИС ОВК |
| `unplannedEventCancel` | fcsIntegration.xsd | Пакет данных: Информация об отмене проведения внепланового контрольного мероприятия для ОВК |
| `unplannedEventCancel` | fcsPrintForm.xsd | Информации об отмене проведения внепланового контрольного мероприятия для ИС ОВК |

## group

| NAME | FILE | DESCRIPTION |
| --- | --- | --- |
| `printFormClarificationFields` | fcsPrintForm.xsd | Дополнительная информация для ПФ разъяснения положений аукционной документации |
| `printFormClarificationRequestFields` | fcsPrintForm.xsd | Дополнительная информация для ПФ информации о запросе на разъяснения положений аукционной документации |
| `printFormProtocolFields` | fcsPrintForm.xsd | Дополнительная информация для ПФ протоколов в неструктурированной форме |

## attributeGroup

| NAME | FILE | DESCRIPTION |
| --- | --- | --- |
| `dlBlockAttr` | CommonTypes.xsd | Атрибут: Атрибут для блока (поставщик и заказчик) |
| `dlBlockWithout0Attr` | CommonTypes.xsd | Атрибут: Атрибут для блока |
| `dlFieldAttr` | CommonTypes.xsd | Атрибут: Атрибут для поля |
| `dlRowAttr` | CommonTypes.xsd | Атрибут: Атрибут для строки |
