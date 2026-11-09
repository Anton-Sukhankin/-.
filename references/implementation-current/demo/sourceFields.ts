import type { SourceField } from '../data/sourceDetails';

/** Authored prototype schemas, not recovered database dictionaries. */
type FieldSeed = readonly [name:string, sqlType:string, nullable?:boolean, key?:boolean, relatedMetrics?:readonly string[]];
function fields(seeds:readonly FieldSeed[]):readonly SourceField[] {
  return seeds.map(([name,sqlType,nullable=false,key=false,relatedMetrics])=>({
    name,sqlType,nullable,key,relatedMetrics,
    genericType:sqlType==='BIT'?'BooleanType':sqlType==='DATE'?'DateType':/^(DATETIME|TIMESTAMP)/.test(sqlType)?'DateTimeType':/^(INT|BIGINT|SMALLINT|TINYINT|DECIMAL|INTEGER)/.test(sqlType)?'NumberType':'StringType',
  }));
}

const calendar:readonly FieldSeed[] = [
  ['date_key','INT',false,true,['Количество рабочих дней','Количество выходных дней','Количество праздничных дней']],
  ['full_date','DATE'], ['calendar_year','SMALLINT',false,false,['Количество дней в году']],
  ['calendar_quarter','TINYINT'], ['quarter_name','NVARCHAR'], ['month_number','TINYINT'],
  ['month_name','NVARCHAR'], ['month_short_name','NVARCHAR'], ['day_of_month','TINYINT'],
  ['day_of_year','SMALLINT'], ['day_of_week','TINYINT'], ['day_name','NVARCHAR'],
  ['week_of_year','TINYINT'], ['iso_week','TINYINT'], ['iso_year','SMALLINT'],
  ['is_weekend','BIT'], ['is_holiday','BIT'], ['holiday_name','NVARCHAR',true],
  ['is_working_day','BIT'], ['month_start','DATE'], ['month_end','DATE'],
  ['quarter_start','DATE'], ['quarter_end','DATE'], ['year_start','DATE'], ['year_end','DATE'],
];

export const demoSourceFields:Readonly<Record<string,readonly SourceField[]>> = {
  'source-reportcrm-date':fields([...calendar,
    ['fiscal_year','SMALLINT'], ['fiscal_quarter','TINYINT'], ['fiscal_month','TINYINT'],
    ['year_month','CHAR'], ['year_quarter','CHAR'], ['week_start','DATE'], ['week_end','DATE'],
    ['previous_year_date','DATE',true], ['created_at','DATETIME2'],
  ]),
  'source-dwh-date':fields([...calendar,
    ['reporting_period','CHAR'], ['financial_year','SMALLINT'], ['financial_period','TINYINT'],
    ['is_month_closed','BIT'], ['is_quarter_closed','BIT'], ['working_day_number','SMALLINT',true],
    ['etl_loaded_at','DATETIME2'], ['source_system','NVARCHAR'],
  ]),
  'source-dwh-project':fields([
    ['project_id','BIGINT',false,true], ['project_code','NVARCHAR'], ['project_name','NVARCHAR'],
    ['project_description','NVARCHAR',true], ['status','NVARCHAR'], ['portfolio_id','BIGINT',true],
    ['customer_id','BIGINT'], ['manager_id','BIGINT',true], ['department_code','NVARCHAR'],
    ['start_date','DATE'], ['planned_end_date','DATE',true], ['actual_end_date','DATE',true],
    ['budget_amount','DECIMAL',true], ['actual_cost','DECIMAL',true], ['currency_code','CHAR'],
    ['completion_percent','DECIMAL'], ['is_archived','BIT'], ['created_at','DATETIME2'],
    ['updated_at','DATETIME2'], ['etl_loaded_at','DATETIME2'],
  ]),
  'source-demo-clients':fields([
    ['client_id','BIGINT',false,true], ['full_name','NVARCHAR'], ['email','NVARCHAR',true],
    ['phone','NVARCHAR',true], ['client_type','NVARCHAR'], ['segment','NVARCHAR',true],
    ['registration_date','DATE'], ['city','NVARCHAR',true], ['country_code','CHAR'],
    ['consent_personal_data','BIT'], ['is_active','BIT'], ['updated_at','DATETIME2'],
  ]),
  'source-demo-contracts':fields([
    ['contract_id','BIGINT',false,true], ['contract_number','NVARCHAR'], ['client_id','BIGINT'],
    ['contract_type','NVARCHAR'], ['status','NVARCHAR'], ['signed_at','DATE',true],
    ['valid_from','DATE'], ['valid_to','DATE',true], ['amount','DECIMAL'], ['currency_code','CHAR'],
    ['payment_terms','NVARCHAR',true], ['manager_id','BIGINT',true], ['department_code','NVARCHAR'],
    ['subject','NVARCHAR'], ['termination_date','DATE',true], ['is_renewable','BIT'],
    ['created_at','DATETIME2'], ['updated_at','DATETIME2'],
  ]),
  'source-demo-sales':fields([
    ['sale_id','BIGINT',false,true], ['sale_date','DATE'], ['order_id','BIGINT'], ['order_number','NVARCHAR'],
    ['client_id','BIGINT'], ['contract_id','BIGINT',true], ['product_id','BIGINT'], ['product_name','NVARCHAR'],
    ['product_category','NVARCHAR'], ['quantity','DECIMAL'], ['unit_price','DECIMAL'],
    ['discount_amount','DECIMAL'], ['net_amount','DECIMAL'], ['tax_amount','DECIMAL'],
    ['gross_amount','DECIMAL'], ['currency_code','CHAR'], ['payment_status','NVARCHAR'],
    ['sales_channel','NVARCHAR'], ['region_code','NVARCHAR'], ['manager_id','BIGINT',true],
    ['is_return','BIT'], ['return_reason','NVARCHAR',true], ['created_at','DATETIME2'], ['updated_at','DATETIME2'],
  ]),
  'source-demo-requests':fields([
    ['request_id','BIGINT',false,true], ['request_number','NVARCHAR'], ['request_type','NVARCHAR'],
    ['subject','NVARCHAR'], ['description','NVARCHAR',true], ['status','NVARCHAR'],
    ['priority','NVARCHAR'], ['requester_id','BIGINT'], ['assignee_id','BIGINT',true],
    ['service_code','NVARCHAR'], ['created_at','DATETIME2'], ['due_at','DATETIME2',true],
    ['resolved_at','DATETIME2',true], ['resolution','NVARCHAR',true], ['sla_breached','BIT'],
  ]),
  'source-demo-feedback':fields([
    ['feedback_id','BIGINT',false,true], ['request_id','BIGINT'], ['rating','TINYINT'],
    ['comment','NVARCHAR',true], ['channel','NVARCHAR'], ['submitted_at','DATETIME2'],
    ['is_anonymous','BIT'], ['service_code','NVARCHAR'], ['sentiment','NVARCHAR',true], ['processed_at','DATETIME2',true],
  ]),
};
