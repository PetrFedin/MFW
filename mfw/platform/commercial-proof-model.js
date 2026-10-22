(function(root,factory){
  'use strict';
  var api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.MFP_COMMERCIAL_PROOF=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';

  // All amounts in this client-side model are user-entered assumptions.
  // This model is not the booking, billing, accounting or payment authority.
  var version='mfw-commercial-proof-ladder-v1';
  var defaults=Object.freeze({
    paidBrands:0,
    brandMonthlyFee:0,
    brandServiceCost:0,
    partnerPackages:0,
    packageMonthlyFee:0,
    packageServiceCost:0,
    fixedMonthlyCost:0,
    horizonMonths:12
  });
  var fields=Object.freeze([
    {key:'paidBrands',label:'Платящие бренды',unit:'организаций',kind:'count',max:100000,step:'1'},
    {key:'brandMonthlyFee',label:'Тариф Brand365 / месяц',unit:'₽ за бренд',kind:'money',max:10000000,step:'0.01'},
    {key:'brandServiceCost',label:'Переменные затраты / бренд',unit:'₽ в месяц',kind:'money',max:10000000,step:'0.01'},
    {key:'partnerPackages',label:'Партнёрские пакеты',unit:'активных в месяц',kind:'count',max:100000,step:'1'},
    {key:'packageMonthlyFee',label:'Стоимость пакета / месяц',unit:'₽ за пакет',kind:'money',max:10000000,step:'0.01'},
    {key:'packageServiceCost',label:'Переменные затраты / пакет',unit:'₽ в месяц',kind:'money',max:10000000,step:'0.01'},
    {key:'fixedMonthlyCost',label:'Фиксированные расходы',unit:'₽ в месяц',kind:'money',max:10000000,step:'0.01'},
    {key:'horizonMonths',label:'Горизонт сценария',unit:'месяцев',kind:'months',min:1,max:36,step:'1'}
  ]);
  var evidenceStages=Object.freeze([
    {id:'pilot',label:'ПИЛОТ',proof:'Согласованный пилот и цели',meaning:'Проверка гипотезы, не признанная выручка'},
    {id:'contract',label:'ДОГОВОР',proof:'Подписанные условия и предмет оплаты',meaning:'Коммерческое обязательство, не поступление денег'},
    {id:'delivery',label:'ИСПОЛНЕНИЕ',proof:'Фактическая поставка услуги / доступ',meaning:'Первичный факт исполнения'},
    {id:'acceptance',label:'ПРИЁМКА',proof:'Акт либо иное подтверждение по условиям',meaning:'Проверяется применимость договорной приёмки'},
    {id:'invoice',label:'СЧЁТ',proof:'Счёт и период выставления',meaning:'Выставление счёта само по себе не равно выручке'},
    {id:'finance',label:'УЧЁТ',proof:'Решение финансовой функции и учётная запись',meaning:'Признание требует утверждённой методики и источника'},
    {id:'payment',label:'ОПЛАТА',proof:'Банковское подтверждение поступления',meaning:'Денежный поток отдельно от выручки'},
    {id:'renewal',label:'ПОВТОР',proof:'Новый договор или продление',meaning:'Доказательство повторной коммерческой ценности'}
  ]);

  function normalize(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new TypeError('assumptions_object_required');
    var result={};
    fields.forEach(function(field){
      var value=raw[field.key];
      var text=String(value===undefined||value===null?'':value).trim();
      var isInteger=field.kind!=='money';
      var allowed=isInteger?/^\d+$/:/^\d+(?:\.\d{1,2})?$/;
      if(!allowed.test(text))throw new RangeError('invalid_assumption:'+field.key);
      var number=Number(text);
      if(!Number.isFinite(number)||!Number.isSafeInteger(isInteger?number:Math.round(number*100))||
         number<(field.min||0)||number>field.max){
        throw new RangeError('invalid_assumption:'+field.key);
      }
      result[field.key]=number;
    });
    return result;
  }
  function toKopeks(value){return Math.round(value*100);}
  function toRubles(value){return value/100;}
  function scenario(raw){
    var a=normalize(raw);
    var brandsIncome=a.paidBrands*toKopeks(a.brandMonthlyFee);
    var partnerIncome=a.partnerPackages*toKopeks(a.packageMonthlyFee);
    var brandsCost=a.paidBrands*toKopeks(a.brandServiceCost);
    var partnerCost=a.partnerPackages*toKopeks(a.packageServiceCost);
    var fixed=toKopeks(a.fixedMonthlyCost);
    var potential=brandsIncome+partnerIncome;
    var variable=brandsCost+partnerCost;
    var contribution=potential-variable;
    var operating=contribution-fixed;
    var brandUnit=toKopeks(a.brandMonthlyFee)-toKopeks(a.brandServiceCost);
    var partnerContribution=partnerIncome-partnerCost;
    var breakEvenBrands=null;
    if(brandUnit>0)breakEvenBrands=Math.ceil(Math.max(0,fixed-partnerContribution)/brandUnit);
    else if(partnerContribution>0&&partnerContribution>=fixed)breakEvenBrands=0;
    // The period projection holds the assumed client counts constant; no churn or CAC is inferred.
    return {
      schemaVersion:version,
      truthClass:'MODELLED',
      admitted:false,
      assumptions:a,
      monthly:{
        potentialCommercialValue:toRubles(potential),
        variableCost:toRubles(variable),
        fixedCost:toRubles(fixed),
        contribution:toRubles(contribution),
        operatingResult:toRubles(operating),
        contributionMarginPct:potential>0?Math.round(contribution/potential*10000)/100:null
      },
      horizon:{
        months:a.horizonMonths,
        potentialCommercialValue:toRubles(potential*a.horizonMonths),
        operatingResult:toRubles(operating*a.horizonMonths)
      },
      breakEvenBrands:breakEvenBrands,
      actual:{
        recognisedRevenue:null,
        collectedCash:null,
        billedAmount:null,
        auditedArr:null,
        auditedMrr:null
      },
      caveat:'MODELLED ONLY; not revenue, cash, contracts, ARR or audited unit economics.'
    };
  }

  // Reproducible, assumption-only sensitivity (money per unit rounded to the
  // nearest kopek BEFORE multiplication, so decimal prices stay deterministic).
  // Counts and horizon remain fixed; this is not a forecast distribution.
  function sensitivity(raw){
    var a=normalize(raw),baseline=scenario(a);
    var profiles=[
      {id:'base',label:'Базовые допущения',fees:100,costs:100},
      {id:'tariffs_down',label:'Тарифы −10%',fees:90,costs:100},
      {id:'costs_up',label:'Затраты +10%',fees:100,costs:110},
      {id:'combined',label:'Тарифы −10% / затраты +10%',fees:90,costs:110}
    ];
    var rows=profiles.map(function(p){
      function revised(value,multiplier){
        return Math.round(toKopeks(value)*multiplier/100);
      }
      var brandsIncome=a.paidBrands*revised(a.brandMonthlyFee,p.fees);
      var partnerIncome=a.partnerPackages*revised(a.packageMonthlyFee,p.fees);
      var brandsCost=a.paidBrands*revised(a.brandServiceCost,p.costs);
      var partnerCost=a.partnerPackages*revised(a.packageServiceCost,p.costs);
      var fixed=revised(a.fixedMonthlyCost,p.costs);
      var potential=brandsIncome+partnerIncome,variable=brandsCost+partnerCost;
      var operating=potential-variable-fixed;
      var brandUnit=revised(a.brandMonthlyFee,p.fees)-revised(a.brandServiceCost,p.costs);
      var partnerUnit=partnerIncome-partnerCost;
      var breakEven=null;
      if(brandUnit>0)breakEven=Math.ceil(Math.max(0,fixed-partnerUnit)/brandUnit);
      else if(partnerUnit>=fixed)breakEven=0;
      return {id:p.id,label:p.label,
        feeMultiplierPct:p.fees,costMultiplierPct:p.costs,
        monthlyPotentialValue:toRubles(potential),
        monthlyOperatingResult:toRubles(operating),
        contributionMarginPct:potential?Math.round((potential-variable)/potential*10000)/100:null,
        breakEvenBrands:breakEven,
        deltaToBaseline:toRubles(operating)-baseline.monthly.operatingResult};
    });
    return {truthClass:'MODELLED',admitted:false,rows:rows,
      baselineOperatingResult:baseline.monthly.operatingResult,
      actualRevenue:null,probabilityOfOutcome:null,
      method:'Тарифы снижаются на 10% по каждой единице; переменные и фиксированные затраты повышаются на 10% по каждой единице. Округление тарифа/затраты до копейки перед умножением. Количество платящих организаций неизменно. Никаких вероятностей, churn, CAC, налогов и признанной выручки.'};
  }

  // A browser is not a finance authority. User-supplied reference strings and
  // authorityAdmitted=true booleans do NOT provide cryptographic source proof.
  // Future server admission must validate issuer, scope, revocation and signatures
  // server-side, then publish a separately authenticated read-only projection.
  function hasAdmittedEvidence(_entry){return false;}
  function auditEvidence(_untrustedRecords){
    const stages=evidenceStages.map(function(stage){
      return {id:stage.id,label:stage.label,proof:stage.proof,meaning:stage.meaning,
        evidenceState:'NOT_EVIDENCED'};
    });
    return {
      schemaVersion:version,
      stages:stages,
      readyForFinanceReview:false,
      productionRecognised:false,
      recognisedRevenue:null,
      cashCollected:null,
      missing:stages.map(function(stage){return stage.id;}),
      note:'Client-side entries cannot admit finance evidence. The server must independently authenticate source provenance, roles and revocation.'
    };
  }

  return Object.freeze({
    version:version,defaults:defaults,fields:fields,evidenceStages:evidenceStages,
    normalize:normalize,scenario:scenario,sensitivity:sensitivity,auditEvidence:auditEvidence,
    hasAdmittedEvidence:hasAdmittedEvidence
  });
});
